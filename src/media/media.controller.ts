import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('media')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-audio')
  @ApiOperation({ summary: 'Subir un archivo de audio' })
  @ApiResponse({ status: 201, description: 'Audio subido correctamente' })
  @ApiResponse({
    status: 400,
    description: 'Formato de archivo no válido o excede los 10MB',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo de audio (MP3, WAV, OGG, M4A) máx. 10MB',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // Límite de 10 MB
      },
      fileFilter: (req, file, callback) => {
        // Validar que sea un archivo de audio
        if (!file.mimetype.match(/^audio\/(mpeg|mp3|wav|ogg|aac|mp4|x-m4a)$/)) {
          return callback(
            new BadRequestException('Solo se permiten archivos de audio'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadAudio(
    @UploadedFile() file: Parameters<MediaService['uploadAudio']>[0],
  ) {
    const urlAudio = await this.mediaService.uploadAudio(file);
    return { urlAudio };
  }

  @Get('audios')
  @ApiOperation({
    summary: 'Obtener la lista de todos los audios subidos',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de audios registrados',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async getAudios() {
    return this.mediaService.listAudios();
  }

  @Get('audios/:fileKey')
  @ApiOperation({ summary: 'Reproducir un audio subido (streaming)' })
  @ApiResponse({ status: 200, description: 'Archivo de audio' })
  @ApiResponse({ status: 404, description: 'Audio no encontrado' })
  async streamAudio(
    @Param('fileKey') fileKey: string,
  ): Promise<StreamableFile> {
    const { body, contentType } = await this.mediaService.streamAudio(fileKey);
    return new StreamableFile(body, {
      type: contentType ?? 'application/octet-stream',
    });
  }

  @Delete('audios/:fileKey')
  @ApiOperation({
    summary: 'Eliminar un audio y limpiar sus referencias en las alarmas',
  })
  @ApiResponse({
    status: 200,
    description:
      'Audio eliminado y referencias actualizadas a NULL en las alarmas correspondientes',
  })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  async deleteAudio(@Param('fileKey') fileKey: string) {
    return this.mediaService.deleteAudio(fileKey);
  }
}
