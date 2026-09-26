import {
  Controller,
  Get,
  Param,
  UseGuards,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiTags,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

/**
 * Endpoints de audio para la app móvil, protegidos con X-API-KEY.
 * Ruta base distinta a la de los endpoints de administrador (JWT).
 */
@ApiTags('mobile')
@ApiSecurity('api-key')
@Controller('mobile/audios')
export class MobileMediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Get(':fileKey')
  @UseGuards(ApiKeyGuard)
  @ApiOperation({
    summary: 'Reproducir/descargar un audio subido (App Móvil)',
  })
  @ApiResponse({ status: 200, description: 'Archivo de audio' })
  @ApiResponse({ status: 401, description: 'Clave de API inválida o ausente' })
  @ApiResponse({ status: 404, description: 'Audio no encontrado' })
  async streamAudio(
    @Param('fileKey') fileKey: string,
  ): Promise<StreamableFile> {
    const { body, contentType } = await this.mediaService.streamAudio(fileKey);
    return new StreamableFile(body, {
      type: contentType ?? 'application/octet-stream',
    });
  }
}
