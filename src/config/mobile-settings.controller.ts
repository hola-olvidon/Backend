import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

/**
 * Endpoint para la app móvil: expone la zona horaria del servidor para que el cliente Android
 * pueda interpretar los horarios de las alarmas recurrentes y mostrársela al usuario.
 */
@ApiTags('mobile')
@Controller('mobile')
export class MobileSettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get('config')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Obtener la configuración del servidor (zona horaria) para la app móvil',
  })
  @ApiResponse({ status: 200, description: 'Configuración del servidor' })
  @ApiResponse({ status: 401, description: 'Clave de API inválida o no proporcionada' })
  getConfig() {
    return this.settingsService.getConfig();
  }
}
