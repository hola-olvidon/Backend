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
S3_HOST="${AWS_S3_ENDPOINT%%:*}" # Extrae el host si viene con puerto
S3_PORT=$(echo ${AWS_S3_ENDPOINT} | grep -oP '(?<=:)\d+$' || echo "9000")

echo "Esperando RustFS en ${S3_HOST}:${S3_PORT}..."
while ! node -e "const net=require('net'); const host=process.argv[1]; const port=Number(process.argv[2]); const socket=net.connect({host, port}); socket.on('connect',()=>process.exit(0)); socket.on('error',()=>process.exit(1));" "$S3_HOST" "$S3_PORT"; do
  sleep 2
done

# --- Creación del Bucket de RustFS ---
if [ -n "${AWS_S3_BUCKET_NAME:-}" ]; then
  echo "Asegurando que el bucket ${AWS_S3_BUCKET_NAME} exista..."
  # Usamos un script inline de node para crear el bucket via S3 API simplificada (PUT /bucket)
  # Nota: RustFS permite crear buckets via API simple. Usamos curl si está disponible o un pequeño script de node.
  node -e "
    const http = require('http');
    const bucket = process.env.AWS_S3_BUCKET_NAME;
    const endpoint = process.env.AWS_S3_ENDPOINT;
    const host = new URL(endpoint).host;
    const port = new URL(endpoint).port || 80;

    const req = http.request({
      hostname: host,
      port: port,
      path: '/' + bucket,
      method: 'PUT',
    }, (res) => {
      if (res.statusCode === 200) console.log('Bucket creado exitosamente o ya existía.');
      else console.log('Estado al crear bucket: ' + res.statusCode);
      process.exit(0);
    });
    req.on('error', (e) => {
      console.error('Error creando bucket: ' + e.message);
      process.exit(0); // No fallamos el inicio si el bucket falla, dejamos que la app lo maneje
    });
    req.end();
  "
fi

echo "Aplicando migraciones de Prisma..."
npx prisma migrate deploy

echo "Iniciando la aplicación..."
exec npm run start:prod
