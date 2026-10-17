const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const mime = require('mime-types');

// Initialize S3 Client with Cloudflare R2
const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const DEFAULT_BUCKET = process.env.R2_BUCKET_NAME || 'bucketwestnorthamerica';
const PUBLIC_DOMAIN = (process.env.R2_PUBLIC_DOMAIN || '').replace(/\/$/, '');

// Session Operation Counter (Class A vs Class B) to safeguard free tier
const operationStats = {
  classA: 0, // Put, Copy, Delete, List, Multipart
  classB: 0, // Get, Head
  history: [],
};

function recordOperation(type, details) {
  if (type === 'A') operationStats.classA++;
  if (type === 'B') operationStats.classB++;
  operationStats.history.unshift({
    type,
    time: new Date().toISOString(),
    details,
  });
  if (operationStats.history.length > 50) operationStats.history.pop();
}

// In-Memory Cache for directory listings to prevent burning Class A ListObjects quota
const dirCache = new Map();
const CACHE_TTL = 30 * 1000; // 30 seconds

function getCacheKey(bucket, prefix) {
  return `${bucket}:::${prefix || ''}`;
}

function invalidateCache(bucket, prefix) {
  // If specific prefix given, invalidate it and its parent
  const key = getCacheKey(bucket, prefix);
  dirCache.delete(key);
  // Also clear root or parent if applicable
  if (prefix) {
    const parent = prefix.replace(/[^\/]+\/?$/, '');
    dirCache.delete(getCacheKey(bucket, parent));
  } else {
    dirCache.clear();
  }
}

function clearAllCache() {
  dirCache.clear();
}

/**
 * List files and subfolders in current prefix (delimiter = '/')
 */
async function listItems(prefix = '', bucket = DEFAULT_BUCKET, forceRefresh = false) {
  const cacheKey = getCacheKey(bucket, prefix);
  if (!forceRefresh && dirCache.has(cacheKey)) {
    const cached = dirCache.get(cacheKey);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return { ...cached.data, fromCache: true };
    }
  }

  recordOperation('A', `ListObjectsV2 for prefix: "${prefix}"`);

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
    Delimiter: '/',
  });

  const response = await s3.send(command);

  // Subfolders in this directory
  const folders = (response.CommonPrefixes || []).map((cp) => {
    const fullPath = cp.Prefix;
    // Extract folder name from prefix: 'photos/2026/' -> '2026'
    const trimmed = fullPath.endsWith('/') ? fullPath.slice(0, -1) : fullPath;
    const name = trimmed.split('/').pop() || trimmed;
    return {
      type: 'folder',
      name,
      prefix: fullPath,
      parentPrefix: prefix,
    };
  });

  // Files in this directory (exclude the directory placeholder itself if it matches prefix)
  const files = (response.Contents || [])
    .filter((obj) => obj.Key !== prefix && !obj.Key.endsWith('/'))
    .map((obj) => {
      const name = obj.Key.split('/').pop() || obj.Key;
      const mimeType = mime.lookup(name) || 'application/octet-stream';
      const publicUrl = PUBLIC_DOMAIN
        ? `${PUBLIC_DOMAIN}/${encodeURI(obj.Key)}`
        : null;

      return {
        type: 'file',
        key: obj.Key,
        name,
        size: obj.Size,
        lastModified: obj.LastModified,
        etag: obj.ETag ? obj.ETag.replace(/"/g, '') : null,
        mimeType,
        publicUrl,
      };
    });

  const data = {
    bucket,
    currentPrefix: prefix,
    folders,
    files,
    isTruncated: !!response.IsTruncated,
    nextContinuationToken: response.NextContinuationToken,
  };

  dirCache.set(cacheKey, { timestamp: Date.now(), data });
  return { ...data, fromCache: false };
}

/**
 * Create a new folder (represented as a 0-byte object ending in '/')
 */
async function createFolder(prefix = '', folderName, bucket = DEFAULT_BUCKET) {
  let cleanName = folderName.trim().replace(/\/+$/, '');
  if (!cleanName) throw new Error('Folder name cannot be empty');
  const folderKey = prefix ? `${prefix}${cleanName}/` : `${cleanName}/`;

  recordOperation('A', `CreateFolder: "${folderKey}"`);

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
      Body: '',
      ContentType: 'application/x-directory',
    })
  );

  invalidateCache(bucket, prefix);
  return { success: true, folderKey };
}

/**
 * Upload single file buffer or stream
 */
async function uploadFile(key, buffer, contentType, bucket = DEFAULT_BUCKET) {
  recordOperation('A', `PutObject: "${key}"`);

  const detectedType = contentType || mime.lookup(key) || 'application/octet-stream';

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: detectedType,
    })
  );

  const prefix = key.includes('/') ? key.substring(0, key.lastIndexOf('/') + 1) : '';
  invalidateCache(bucket, prefix);
  return { success: true, key };
}

/**
 * Delete a single file or a folder (with all its recursive contents)
 */
async function deleteItem(key, isFolder = false, bucket = DEFAULT_BUCKET) {
  if (isFolder) {
    const folderPrefix = key.endsWith('/') ? key : `${key}/`;
    recordOperation('A', `List recursive for delete: "${folderPrefix}"`);

    // List all objects under this folder recursively
    let continuationToken = null;
    let totalDeleted = 0;

    do {
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: folderPrefix,
          ContinuationToken: continuationToken,
        })
      );

      const objectsToDelete = (listRes.Contents || []).map((o) => ({ Key: o.Key }));
      if (objectsToDelete.length > 0) {
        recordOperation('A', `DeleteObjects batch (${objectsToDelete.length} items)`);
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: objectsToDelete, Quiet: true },
          })
        );
        totalDeleted += objectsToDelete.length;
      }

      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    // Also delete the folder marker itself if separate
    try {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: folderPrefix }));
    } catch (e) {
      // ignore if already deleted
    }

    const parentPrefix = folderPrefix.replace(/[^\/]+\/?$/, '');
    invalidateCache(bucket, parentPrefix);
    return { success: true, totalDeleted };
  } else {
    recordOperation('A', `DeleteObject: "${key}"`);
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

    const prefix = key.includes('/') ? key.substring(0, key.lastIndexOf('/') + 1) : '';
    invalidateCache(bucket, prefix);
    return { success: true };
  }
}

/**
 * Batch delete multiple items (files and folders)
 */
async function batchDelete(items, bucket = DEFAULT_BUCKET) {
  for (const item of items) {
    await deleteItem(item.key, item.isFolder, bucket);
  }
  clearAllCache();
  return { success: true, count: items.length };
}

/**
 * Copy a file or folder to a target destination
 */
async function copyItem(srcKey, destPrefix, isFolder = false, bucket = DEFAULT_BUCKET) {
  if (isFolder) {
    const srcFolder = srcKey.endsWith('/') ? srcKey : `${srcKey}/`;
    const folderName = srcFolder.slice(0, -1).split('/').pop();
    const destFolder = destPrefix ? `${destPrefix}${folderName}/` : `${folderName}/`;

    let continuationToken = null;
    do {
      recordOperation('A', `List for copy folder: "${srcFolder}"`);
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: srcFolder,
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of listRes.Contents || []) {
        const subPath = obj.Key.substring(srcFolder.length);
        const newKey = `${destFolder}${subPath}`;
        recordOperation('A', `CopyObject: "${obj.Key}" -> "${newKey}"`);

        await s3.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${encodeURIComponent(obj.Key)}`,
            Key: newKey,
          })
        );
      }
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    clearAllCache();
    return { success: true, destFolder };
  } else {
    const fileName = srcKey.split('/').pop();
    const destKey = destPrefix ? `${destPrefix}${fileName}` : fileName;

    recordOperation('A', `CopyObject: "${srcKey}" -> "${destKey}"`);
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(srcKey)}`,
        Key: destKey,
      })
    );

    clearAllCache();
    return { success: true, destKey };
  }
}

/**
 * Move a file or folder (Copy then Delete)
 */
async function moveItem(srcKey, destPrefix, isFolder = false, bucket = DEFAULT_BUCKET) {
  await copyItem(srcKey, destPrefix, isFolder, bucket);
  await deleteItem(srcKey, isFolder, bucket);
  clearAllCache();
  return { success: true };
}

/**
 * Rename a file or folder
 */
async function renameItem(oldKey, newName, isFolder = false, bucket = DEFAULT_BUCKET) {
  let cleanName = newName.trim();
  if (!cleanName) throw new Error('New name cannot be empty');

  if (isFolder) {
    const oldFolder = oldKey.endsWith('/') ? oldKey : `${oldKey}/`;
    const parent = oldFolder.replace(/[^\/]+\/?$/, '');
    const newFolder = `${parent}${cleanName}/`;

    if (oldFolder === newFolder) return { success: true };

    let continuationToken = null;
    const oldKeysToDelete = [];

    do {
      recordOperation('A', `List for rename folder: "${oldFolder}"`);
      const listRes = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket,
          Prefix: oldFolder,
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of listRes.Contents || []) {
        const subPath = obj.Key.substring(oldFolder.length);
        const newObjKey = `${newFolder}${subPath}`;
        recordOperation('A', `Copy for rename: "${obj.Key}" -> "${newObjKey}"`);

        await s3.send(
          new CopyObjectCommand({
            Bucket: bucket,
            CopySource: `${bucket}/${encodeURIComponent(obj.Key)}`,
            Key: newObjKey,
          })
        );
        oldKeysToDelete.push({ Key: obj.Key });
      }
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    if (oldKeysToDelete.length > 0) {
      recordOperation('A', `Delete old keys after rename: ${oldKeysToDelete.length}`);
      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: oldKeysToDelete, Quiet: true },
        })
      );
    }

    clearAllCache();
    return { success: true, newKey: newFolder };
  } else {
    const parent = oldKey.includes('/') ? oldKey.substring(0, oldKey.lastIndexOf('/') + 1) : '';
    const newKey = `${parent}${cleanName}`;

    if (oldKey === newKey) return { success: true };

    recordOperation('A', `Rename CopyObject: "${oldKey}" -> "${newKey}"`);
    await s3.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${encodeURIComponent(oldKey)}`,
        Key: newKey,
      })
    );

    recordOperation('A', `Rename DeleteObject: "${oldKey}"`);
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: oldKey }));

    clearAllCache();
    return { success: true, newKey };
  }
}

/**
 * Get download/presigned URL or read stream
 */
async function getDownloadUrl(key, bucket = DEFAULT_BUCKET) {
  recordOperation('B', `Presigned URL for: "${key}"`);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  // Valid for 1 hour
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

/**
 * Get readable stream for direct proxy download
 */
async function getObjectStream(key, bucket = DEFAULT_BUCKET) {
  recordOperation('B', `GetObject stream for: "${key}"`);
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return await s3.send(command);
}

module.exports = {
  s3,
  DEFAULT_BUCKET,
  PUBLIC_DOMAIN,
  operationStats,
  listItems,
  createFolder,
  uploadFile,
  deleteItem,
  batchDelete,
  copyItem,
  moveItem,
  renameItem,
  getDownloadUrl,
  getObjectStream,
  clearAllCache,
};
