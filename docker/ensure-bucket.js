// Asegura que el bucket de S3/RustFS exista al arrancar el contenedor.
// RustFS es compatible con S3 y espera firma AWS Signature V4 (igual que
// @aws-sdk/client-s3), no autenticación HTTP Basic.
const {
  S3Client,
  HeadBucketCommand,
  CreateBucketCommand,
} = require('@aws-sdk/client-s3');

const endpoint = process.env.AWS_S3_ENDPOINT;
const bucket = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION || 'us-east-1';

if (!endpoint) {
  console.error('Error: AWS_S3_ENDPOINT no está definido.');
  process.exit(1);
}

if (!bucket) {
  console.error('Error: AWS_S3_BUCKET_NAME no está definido.');
  process.exit(1);
}

const client = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function bucketExists() {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (err) {
    const status = err && err.$metadata && err.$metadata.httpStatusCode;
    if (status === 404 || err.name === 'NotFound' || err.name === 'NoSuchBucket') {
      return false;
    }
    throw err;
  }
}

async function main() {
  if (await bucketExists()) {
    console.log(`Bucket ${bucket} ya existe.`);
    return;
  }

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket ${bucket} creado exitosamente.`);
  } catch (err) {
    const status = err && err.$metadata && err.$metadata.httpStatusCode;
    const name = err && err.name;
    if (status === 409 || name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') {
      console.log(`Bucket ${bucket} ya existía.`);
      return;
    }
    console.error(`Error creando bucket ${bucket}:`, name || err.message || err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error asegurando bucket:', (err && (err.name || err.message)) || err);
  process.exit(1);
});
