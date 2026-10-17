require('dotenv').config();
const { S3Client, ListObjectsV2Command, ListBucketsCommand } = require('@aws-sdk/client-s3');

console.log('Testing R2 connection...');
console.log('Endpoint:', process.env.R2_ENDPOINT);
console.log('Bucket:', process.env.R2_BUCKET_NAME);

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function test() {
  try {
    console.log('Listing buckets...');
    const bucketsRes = await s3.send(new ListBucketsCommand({}));
    console.log('Available buckets:', bucketsRes.Buckets?.map(b => b.Name));

    console.log(`Listing objects in bucket "${process.env.R2_BUCKET_NAME}"...`);
    const objectsRes = await s3.send(
      new ListObjectsV2Command({
        Bucket: process.env.R2_BUCKET_NAME,
        MaxKeys: 10,
        Delimiter: '/',
      })
    );
    console.log('Success! Objects found:', objectsRes.Contents?.length || 0);
    console.log('CommonPrefixes (subfolders):', objectsRes.CommonPrefixes?.map(p => p.Prefix) || []);
    console.log('Contents (files):', objectsRes.Contents?.map(c => ({ key: c.Key, size: c.Size })) || []);
  } catch (err) {
    console.error('Error connecting to R2:', err);
  }
}

test();
