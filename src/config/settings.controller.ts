import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('config')
@Controller('config')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener la configuración global (zona horaria)' })
  @ApiResponse({ status: 200, description: 'Configuración actual' })
  getConfig() {
    return this.settingsService.getConfig();
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar la zona horaria del servidor' })
  @ApiResponse({ status: 200, description: 'Zona horaria actualizada' })
  @ApiResponse({ status: 400, description: 'Zona horaria inválida' })
  updateConfig(@Body() updateSettingsDto: UpdateSettingsDto) {
    return this.settingsService.setZonaHoraria(updateSettingsDto.zonaHoraria);
  }
}
