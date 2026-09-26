import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';
import { Readable } from 'stream';

@Injectable()
export class MediaService {
  private s3Client: S3Client;
  private bucketName: string;
  private endpoint: string;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    this.endpoint = process.env.AWS_S3_ENDPOINT || '';
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: this.endpoint,
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      },
    });
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || '';
  }

  async uploadAudio(file: {
    originalname: string;
    buffer: Buffer;
    mimetype: string;
  }): Promise<{ nombreOriginal: string; urlAudio: string }> {
    if (!file) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    // Generar un nombre único para evitar sobreescribir archivos (ej: 123e4567-audio.mp3)
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `audios/${(uuidv4 as () => string)()}.${fileExtension}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        originalfilename: encodeURIComponent(file.originalname),
      },
    });

    await this.s3Client.send(command);

    // Formato correcto para MinIO
    // Limpiamos la barra final del endpoint por si venía con "/"
    const cleanEndpoint = this.endpoint.replace(/\/$/, '');

    // Retorna la URL pública del archivo en S3
    return {
      nombreOriginal: file.originalname,
      urlAudio: `${cleanEndpoint}/${this.bucketName}/${fileName}`,
    };
  }

  async listAudios(): Promise<
    { nombre: string; nombreArchivo: string; urlAudio: string }[]
  > {
    const command = new ListObjectsV2Command({
      Bucket: this.bucketName,
      Prefix: 'audios/',
    });

    const response = await this.s3Client.send(command);

    if (!response.Contents) {
      return [];
    }

    const cleanEndpoint = this.endpoint.replace(/\/$/, '');

    const audiosPromesas = response.Contents.filter(
      (item) => item.Key && item.Key !== 'audios/',
    ).map(async (item) => {
      const nombreArchivo = item.Key!.replace('audios/', '');
      // Consultar metadatos del objeto
      const headCommand = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: item.Key!,
      });
      const metadataResponse = await this.s3Client.send(headCommand);

      const rawName = metadataResponse.Metadata?.originalfilename;
      const nombreOriginal = rawName
        ? decodeURIComponent(rawName)
        : item.Key!.replace('audios/', '');

      return {
        nombre: nombreOriginal,
        nombreArchivo: nombreArchivo,
        urlAudio: `${cleanEndpoint}/${this.bucketName}/${item.Key}`,
      };
    });

    return Promise.all(audiosPromesas);
  }

  async streamAudio(fileKey: string): Promise<{
    body: Readable;
    contentType?: string;
  }> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: `audios/${fileKey}`,
        }),
      );

      return {
        body: response.Body as Readable,
        contentType: response.ContentType,
      };
    } catch (err: unknown) {
      const e = err as {
        name?: string;
        $metadata?: { httpStatusCode?: number };
      };
      if (e?.name === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404) {
        throw new NotFoundException(`Audio "${fileKey}" no encontrado`);
      }
      throw err;
    }
  }

  async deleteAudio(
    fileKey: string,
  ): Promise<{ message: string; alarmasActualizadas: number }> {
    // 1. Armar la URL exacta guardada en BD para buscar coincidencias
    const cleanEndpoint = this.endpoint.replace(/\/$/, '');
    const fullUrl = `${cleanEndpoint}/${this.bucketName}/audios/${fileKey}`;

    // 2. Borrar el objeto en MinIO / S3
    const deleteCommand = new DeleteObjectCommand({
      Bucket: this.bucketName,
      Key: `audios/${fileKey}`,
    });

    await this.s3Client.send(deleteCommand);

    // 3. Actualizar en PostgreSQL/Prisma todas las alarmas que usaban esta URL
    const updateResult = await this.prisma.alarm.updateMany({
      where: {
        urlAudio: fullUrl,
      },
      data: {
        urlAudio: null, // O cambiar por una URL por defecto
      },
    });

    return {
      message: `Archivo audios/${fileKey} eliminado correctamente`,
      alarmasActualizadas: updateResult.count,
    };
  }
}
