// Cloudflare Worker for R2 Explorer
// Serves static assets from client/dist and provides edge API for R2 operations

const operationStats = {
  classA: 0,
  classB: 0,
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

// In-memory cache for edge isolate
const dirCache = new Map();
const CACHE_TTL = 30 * 1000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    // Only route /api/* to the R2 handler
    if (url.pathname.startsWith('/api/')) {
      return handleApi(request, env, url);
    }

    // Otherwise serve static files from client build
    return env.ASSETS.fetch(request);
  },
};

async function handleApi(request, env, url) {
  const path = url.pathname;
  const bucket = env.BUCKET;
  const publicDomain = (env.PUBLIC_DOMAIN || 'https://bucketwna.505250.xyz').replace(/\/$/, '');
  const appPassword = env.APP_PASSWORD || '';

  // Password verification if APP_PASSWORD is set
  if (appPassword) {
    const authHeader = request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || url.searchParams.get('token');
    if (token !== appPassword) {
      if (path === '/api/status') {
        return json({
          status: 'locked',
          requirePassword: true,
          bucket: 'bucketwestnorthamerica',
          publicDomain,
        });
      }
      return json({ error: 'Unauthorized: Invalid password' }, 401);
    }
  }

  // 1. Status
  if (path === '/api/status') {
    const userEmail = request.headers.get('cf-access-authenticated-user-email') || null;
    return json({
      status: 'ok',
      requirePassword: !!appPassword,
      bucket: 'bucketwestnorthamerica',
      publicDomain,
      userEmail,
    });
  }

  // 2. Stats
  if (path === '/api/stats') {
    return json({
      stats: operationStats,
      limits: {
        freeClassA: 1000000,
        freeClassB: 10000000,
        freeStorageGB: 10,
      },
    });
  }

  // 3. List files & folders
  if (path === '/api/files' && request.method === 'GET') {
    const prefix = url.searchParams.get('prefix') || '';
    const forceRefresh = url.searchParams.get('refresh') === 'true';

    if (!forceRefresh && dirCache.has(prefix)) {
      const cached = dirCache.get(prefix);
      if (Date.now() - cached.timestamp < CACHE_TTL) {
        return json({ ...cached.data, fromCache: true });
      }
    }

    recordOperation('A', `List prefix: "${prefix}"`);
    const listed = await bucket.list({
      prefix,
      delimiter: '/',
      limit: 1000,
    });

    const folders = (listed.delimitedPrefixes || []).map((p) => {
      const trimmed = p.endsWith('/') ? p.slice(0, -1) : p;
      const name = trimmed.split('/').pop() || trimmed;
      return {
        type: 'folder',
        name,
        prefix: p,
        parentPrefix: prefix,
      };
    });

    const files = (listed.objects || [])
      .filter((obj) => obj.key !== prefix && !obj.key.endsWith('/'))
      .map((obj) => {
        const name = obj.key.split('/').pop() || obj.key;
        return {
          type: 'file',
          key: obj.key,
          name,
          size: obj.size,
          lastModified: obj.uploaded,
          etag: obj.etag ? obj.etag.replace(/"/g, '') : null,
          mimeType: obj.httpMetadata?.contentType || 'application/octet-stream',
          publicUrl: publicDomain ? `${publicDomain}/${encodeURI(obj.key)}` : null,
        };
      });

    const data = {
      bucket: 'bucketwestnorthamerica',
      currentPrefix: prefix,
      folders,
      files,
      isTruncated: !!listed.truncated,
    };

    dirCache.set(prefix, { timestamp: Date.now(), data });
    return json({ ...data, fromCache: false });
  }

  // 4. Create folder
  if (path === '/api/folders' && request.method === 'POST') {
    const { prefix = '', name } = await request.json();
    if (!name) return json({ error: 'Folder name is required' }, 400);

    const cleanName = name.trim().replace(/\/+$/, '');
    const folderKey = prefix ? `${prefix}${cleanName}/` : `${cleanName}/`;

    recordOperation('A', `Create folder: "${folderKey}"`);
    await bucket.put(folderKey, new Uint8Array(0), {
      httpMetadata: { contentType: 'application/x-directory' },
    });

    dirCache.clear();
    return json({ success: true, folderKey });
  }

  // 5. Upload files
  if (path === '/api/upload' && request.method === 'POST') {
    const formData = await request.formData();
    const prefix = (formData.get('prefix') || '').toString();
    const files = formData.getAll('files');

    if (!files || files.length === 0) {
      return json({ error: 'No files provided' }, 400);
    }

    const results = [];
    for (const file of files) {
      if (file instanceof File) {
        const key = prefix ? `${prefix}${file.name}` : file.name;
        recordOperation('A', `PutObject: "${key}"`);
        await bucket.put(key, file.stream(), {
          httpMetadata: { contentType: file.type || 'application/octet-stream' },
        });
        results.push({ key, name: file.name, size: file.size });
      }
    }

    dirCache.clear();
    return json({ success: true, uploaded: results });
  }

  // 6. Delete items
  if (path === '/api/delete' && request.method === 'POST') {
    const { items } = await request.json();
    if (!items || !Array.isArray(items)) {
      return json({ error: 'No items specified' }, 400);
    }

    for (const item of items) {
      if (item.isFolder) {
        const folderPrefix = item.key.endsWith('/') ? item.key : `${item.key}/`;
        let cursor = undefined;
        do {
          recordOperation('A', `List recursive delete: "${folderPrefix}"`);
          const listRes = await bucket.list({ prefix: folderPrefix, cursor });
          const keysToDelete = (listRes.objects || []).map((o) => o.key);
          if (keysToDelete.length > 0) {
            recordOperation('A', `DeleteObjects: ${keysToDelete.length} items`);
            await bucket.delete(keysToDelete);
          }
          cursor = listRes.cursor;
        } while (cursor);
        await bucket.delete(folderPrefix);
      } else {
        recordOperation('A', `DeleteObject: "${item.key}"`);
        await bucket.delete(item.key);
      }
    }

    dirCache.clear();
    return json({ success: true, count: items.length });
  }

  // 7. Copy items
  if (path === '/api/copy' && request.method === 'POST') {
    const { srcKey, destPrefix = '', isFolder = false } = await request.json();
    if (isFolder) {
      const srcFolder = srcKey.endsWith('/') ? srcKey : `${srcKey}/`;
      const folderName = srcFolder.slice(0, -1).split('/').pop();
      const destFolder = destPrefix ? `${destPrefix}${folderName}/` : `${folderName}/`;

      let cursor = undefined;
      do {
        const listRes = await bucket.list({ prefix: srcFolder, cursor });
        for (const obj of listRes.objects || []) {
          const subPath = obj.key.substring(srcFolder.length);
          const newKey = `${destFolder}${subPath}`;
          const fileObj = await bucket.get(obj.key);
          if (fileObj) {
            recordOperation('A', `Copy: "${obj.key}" -> "${newKey}"`);
            await bucket.put(newKey, fileObj.body, {
              httpMetadata: fileObj.httpMetadata,
            });
          }
        }
        cursor = listRes.cursor;
      } while (cursor);
    } else {
      const fileName = srcKey.split('/').pop();
      const destKey = destPrefix ? `${destPrefix}${fileName}` : fileName;
      const fileObj = await bucket.get(srcKey);
      if (fileObj) {
        recordOperation('A', `Copy: "${srcKey}" -> "${destKey}"`);
        await bucket.put(destKey, fileObj.body, {
          httpMetadata: fileObj.httpMetadata,
        });
      }
    }

    dirCache.clear();
    return json({ success: true });
  }

  // 8. Move items
  if (path === '/api/move' && request.method === 'POST') {
    const { srcKey, destPrefix = '', isFolder = false } = await request.json();
    // Copy
    if (isFolder) {
      const srcFolder = srcKey.endsWith('/') ? srcKey : `${srcKey}/`;
      const folderName = srcFolder.slice(0, -1).split('/').pop();
      const destFolder = destPrefix ? `${destPrefix}${folderName}/` : `${folderName}/`;

      let cursor = undefined;
      const keysToDelete = [];
      do {
        const listRes = await bucket.list({ prefix: srcFolder, cursor });
        for (const obj of listRes.objects || []) {
          const subPath = obj.key.substring(srcFolder.length);
          const newKey = `${destFolder}${subPath}`;
          const fileObj = await bucket.get(obj.key);
          if (fileObj) {
            await bucket.put(newKey, fileObj.body, {
              httpMetadata: fileObj.httpMetadata,
            });
            keysToDelete.push(obj.key);
          }
        }
        cursor = listRes.cursor;
      } while (cursor);

      if (keysToDelete.length > 0) {
        await bucket.delete(keysToDelete);
      }
      await bucket.delete(srcFolder);
    } else {
      const fileName = srcKey.split('/').pop();
      const destKey = destPrefix ? `${destPrefix}${fileName}` : fileName;
      const fileObj = await bucket.get(srcKey);
      if (fileObj) {
        await bucket.put(destKey, fileObj.body, {
          httpMetadata: fileObj.httpMetadata,
        });
        await bucket.delete(srcKey);
      }
    }

    dirCache.clear();
    return json({ success: true });
  }

  // 9. Rename
  if (path === '/api/rename' && request.method === 'POST') {
    const { oldKey, newName, isFolder = false } = await request.json();
    if (isFolder) {
      const oldFolder = oldKey.endsWith('/') ? oldKey : `${oldKey}/`;
      const parent = oldFolder.replace(/[^\/]+\/?$/, '');
      const newFolder = `${parent}${newName.trim()}/`;

      let cursor = undefined;
      const oldKeys = [];
      do {
        const listRes = await bucket.list({ prefix: oldFolder, cursor });
        for (const obj of listRes.objects || []) {
          const subPath = obj.key.substring(oldFolder.length);
          const newKey = `${newFolder}${subPath}`;
          const fileObj = await bucket.get(obj.key);
          if (fileObj) {
            await bucket.put(newKey, fileObj.body, {
              httpMetadata: fileObj.httpMetadata,
            });
            oldKeys.push(obj.key);
          }
        }
        cursor = listRes.cursor;
      } while (cursor);

      if (oldKeys.length > 0) await bucket.delete(oldKeys);
      await bucket.delete(oldFolder);
    } else {
      const parent = oldKey.includes('/') ? oldKey.substring(0, oldKey.lastIndexOf('/') + 1) : '';
      const newKey = `${parent}${newName.trim()}`;
      const fileObj = await bucket.get(oldKey);
      if (fileObj) {
        await bucket.put(newKey, fileObj.body, {
          httpMetadata: fileObj.httpMetadata,
        });
        await bucket.delete(oldKey);
      }
    }

    dirCache.clear();
    return json({ success: true });
  }

  // 10. Download
  if (path === '/api/download') {
    const key = url.searchParams.get('key');
    const download = url.searchParams.get('download');
    if (!key) return json({ error: 'key required' }, 400);

    if (publicDomain && !download) {
      return Response.redirect(`${publicDomain}/${encodeURI(key)}`, 302);
    }

    recordOperation('B', `GetObject stream: "${key}"`);
    const object = await bucket.get(key);
    if (!object) return json({ error: 'Object not found' }, 404);

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    if (download === '1' || download === 'true') {
      const filename = key.split('/').pop() || 'download';
      headers.set('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    }

    return new Response(object.body, { headers });
  }

  // 11. Clear Cache
  if (path === '/api/clear-cache') {
    dirCache.clear();
    return json({ success: true });
  }

  return json({ error: 'Not Found' }, 404);
}
