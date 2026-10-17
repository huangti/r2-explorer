require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const r2 = require('./r2');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Multer memory storage for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB per file
  },
});

// 1. Status & Config
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    bucket: r2.DEFAULT_BUCKET,
    publicDomain: r2.PUBLIC_DOMAIN,
    endpoint: process.env.R2_ENDPOINT,
  });
});

// 2. Stats (Class A & B tracking)
app.get('/api/stats', (req, res) => {
  res.json({
    stats: r2.operationStats,
    limits: {
      freeClassA: 1000000,
      freeClassB: 10000000,
      freeStorageGB: 10,
    },
  });
});

// 3. List directory items
app.get('/api/files', async (req, res) => {
  try {
    const prefix = req.query.prefix || '';
    const forceRefresh = req.query.refresh === 'true';
    const result = await r2.listItems(prefix, r2.DEFAULT_BUCKET, forceRefresh);
    res.json(result);
  } catch (err) {
    console.error('Error listing files:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. Create folder
app.post('/api/folders', async (req, res) => {
  try {
    const { prefix = '', name } = req.body;
    if (!name) return res.status(400).json({ error: 'Folder name is required' });
    const result = await r2.createFolder(prefix, name);
    res.json(result);
  } catch (err) {
    console.error('Error creating folder:', err);
    res.status(500).json({ error: err.message });
  }
});

// 5. Upload files
app.post('/api/upload', upload.array('files'), async (req, res) => {
  try {
    const prefix = req.body.prefix || '';
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const results = [];
    for (const file of files) {
      // Decode filename to handle UTF-8 chinese characters properly
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const key = prefix ? `${prefix}${originalName}` : originalName;
      await r2.uploadFile(key, file.buffer, file.mimetype);
      results.push({ key, name: originalName, size: file.size });
    }

    res.json({ success: true, uploaded: results });
  } catch (err) {
    console.error('Error uploading file:', err);
    res.status(500).json({ error: err.message });
  }
});

// 6. Delete items (single or batch)
app.post('/api/delete', async (req, res) => {
  try {
    const { items } = req.body; // array of { key, isFolder }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'No items specified for deletion' });
    }

    const result = await r2.batchDelete(items);
    res.json(result);
  } catch (err) {
    console.error('Error deleting items:', err);
    res.status(500).json({ error: err.message });
  }
});

// 7. Copy items
app.post('/api/copy', async (req, res) => {
  try {
    const { srcKey, destPrefix = '', isFolder = false } = req.body;
    if (!srcKey) return res.status(400).json({ error: 'srcKey is required' });

    const result = await r2.copyItem(srcKey, destPrefix, isFolder);
    res.json(result);
  } catch (err) {
    console.error('Error copying item:', err);
    res.status(500).json({ error: err.message });
  }
});

// 8. Move items (drag-and-drop or cut/paste)
app.post('/api/move', async (req, res) => {
  try {
    const { srcKey, destPrefix = '', isFolder = false } = req.body;
    if (!srcKey) return res.status(400).json({ error: 'srcKey is required' });

    const result = await r2.moveItem(srcKey, destPrefix, isFolder);
    res.json(result);
  } catch (err) {
    console.error('Error moving item:', err);
    res.status(500).json({ error: err.message });
  }
});

// 9. Rename item
app.post('/api/rename', async (req, res) => {
  try {
    const { oldKey, newName, isFolder = false } = req.body;
    if (!oldKey || !newName) {
      return res.status(400).json({ error: 'oldKey and newName are required' });
    }

    const result = await r2.renameItem(oldKey, newName, isFolder);
    res.json(result);
  } catch (err) {
    console.error('Error renaming item:', err);
    res.status(500).json({ error: err.message });
  }
});

// 10. Download or preview stream/url
app.get('/api/download', async (req, res) => {
  try {
    const { key, download } = req.query;
    if (!key) return res.status(400).json({ error: 'key is required' });

    // If public domain is available, we can redirect or return presigned
    if (r2.PUBLIC_DOMAIN && !download) {
      return res.redirect(`${r2.PUBLIC_DOMAIN}/${encodeURI(key)}`);
    }

    const presignedUrl = await r2.getDownloadUrl(key);
    if (download === '1' || download === 'true') {
      // Pipe stream directly with attachment header to trigger browser download
      const s3Stream = await r2.getObjectStream(key);
      const filename = path.basename(key);
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
      if (s3Stream.ContentType) res.setHeader('Content-Type', s3Stream.ContentType);
      if (s3Stream.ContentLength) res.setHeader('Content-Length', s3Stream.ContentLength);
      s3Stream.Body.pipe(res);
    } else {
      res.json({ url: presignedUrl });
    }
  } catch (err) {
    console.error('Error downloading:', err);
    res.status(500).json({ error: err.message });
  }
});

// 11. Clear directory cache
app.post('/api/clear-cache', (req, res) => {
  r2.clearAllCache();
  res.json({ success: true, message: 'Directory cache cleared' });
});

app.listen(port, () => {
  console.log(`R2 Explorer API Server running at http://localhost:${port}`);
});
