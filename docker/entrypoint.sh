#!/bin/sh
set -eu

resolve_db_host() {
  if [ -n "${DATABASE_URL:-}" ]; then
    node -e "const u = new URL(process.env.DATABASE_URL); console.log(u.hostname || 'postgres');"
    return
  fi
  echo "${DB_HOST:-${POSTGRES_HOST:-postgres}}"
}

resolve_db_port() {
  if [ -n "${DATABASE_URL:-}" ]; then
    node -e "const u = new URL(process.env.DATABASE_URL); console.log(String(u.port || 5432));"
    return
  fi
  echo "${DB_PORT:-${POSTGRES_PORT:-5432}}"
}

# --- Espera de PostgreSQL ---
DB_HOST="$(resolve_db_host)"
DB_PORT="$(resolve_db_port)"

echo "Esperando PostgreSQL en ${DB_HOST}:${DB_PORT}..."
while ! node -e "const net=require('net'); const host=process.argv[1]; const port=Number(process.argv[2]); const socket=net.connect({host, port}); socket.on('connect',()=>process.exit(0)); socket.on('error',()=>process.exit(1));" "$DB_HOST" "$DB_PORT"; do
  sleep 2
done

# --- Espera de RustFS ---
S3_HOST=$(node -e "const u = new URL(process.env.AWS_S3_ENDPOINT); console.log(u.hostname);")
S3_PORT=$(node -e "const u = new URL(process.env.AWS_S3_ENDPOINT); console.log(u.port || 9000);")

echo "Esperando RustFS en ${S3_HOST}:${S3_PORT}..."
while ! node -e "const net=require('net'); const host=process.argv[1]; const port=Number(process.argv[2]); const socket=net.connect({host, port}); socket.on('connect',()=>process.exit(0)); socket.on('error',()=>process.exit(1));" "$S3_HOST" "$S3_PORT"; do
  sleep 2
done

# --- Creación del Bucket de RustFS ---
if [ -n "${AWS_S3_BUCKET_NAME:-}" ]; then
  echo "Asegurando que el bucket ${AWS_S3_BUCKET_NAME} exista..."
  node -e "
    const http = require('http');
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const endpoint = process.env.AWS_S3_ENDPOINT;
    const accessKey = process.env.AWS_ACCESS_KEY_ID;
    const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
    const u = new URL(endpoint);

    const auth = Buffer.from(\`\${accessKey}:\${secretKey}\`).toString('base64');

    const req = http.request({
      hostname: u.hostname,
      port: u.port || 80,
      path: '/' + bucket,
      method: 'PUT',
      headers: {
        'Authorization': 'Basic ' + auth
      }
    }, (res) => {
      if (res.statusCode === 200 || res.statusCode === 201) console.log('Bucket creado exitosamente o ya existía.');
      else console.log('Estado al crear bucket: ' + res.statusCode);
      process.exit(0);
    });
    req.on('error', (e) => {
      console.error('Error creando bucket: ' + e.message);
      process.exit(0);
    });
    req.end();
  "
fi

echo "Aplicando migraciones de Prisma..."
# Usamos export para asegurarnos que el subproceso de npx herede la variable
export DATABASE_URL="${DATABASE_URL}"
npx prisma migrate deploy

echo "Iniciando la aplicación..."
exec npm run start:prod
