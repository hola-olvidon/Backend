import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AlarmsService } from './alarms.service';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import {
  ApiTags,
  ApiOperation,
  ApiSecurity,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ApiKeyGuard } from '../auth/api-key.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('alarms')
@Controller('alarms')
export class AlarmsController {
  constructor(private readonly alarmsService: AlarmsService) {}

  // ENDPOINTS DEL ADMINISTRADOR
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear una nueva alarma (Admin)' })
  @ApiResponse({ status: 201, description: 'Alarma creada exitosamente' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  create(@Body() createAlarmDto: CreateAlarmDto) {
    return this.alarmsService.create(createAlarmDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Listar todas las alarmas de todos los tenants (Admin)',
  })
  @ApiResponse({ status: 200, description: 'Listado completo de alarmas' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll() {
    return this.alarmsService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar una alarma (Admin)' })
  @ApiResponse({ status: 200, description: 'Alarma actualizada exitosamente' })
  @ApiResponse({ status: 404, description: 'Alarma no encontrada' })
  update(@Param('id') id: string, @Body() updateAlarmDto: UpdateAlarmDto) {
    return this.alarmsService.update(id, updateAlarmDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar una alarma (Admin)' })
  @ApiResponse({ status: 200, description: 'Alarma eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Alarma no encontrada' })
  remove(@Param('id') id: string) {
    return this.alarmsService.remove(id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Obtener una alarma por ID (Admin)' })
  @ApiResponse({ status: 200, description: 'Detalle de la alarma' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  @ApiResponse({ status: 404, description: 'Alarma no encontrada' })
  findOne(@Param('id') id: string) {
    return this.alarmsService.findOne(id);
  }

  @Get('tenant/:tenantId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Obtener alarmas de un tenant para el Dashboard Admin',
  })
  findForAdmin(@Param('tenantId') tenantId: string) {
    return this.alarmsService.findAllByTenant(tenantId);
  }

  // ENDPOINTS DE LA APP MÓVIL (X-API-KEY)
  @Get('tenant/:tenantId')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Obtener todas las alarmas activas de un Tenant (App Móvil)',
  })
  @ApiResponse({ status: 200, description: 'Lista de alarmas del tenant' })
  @ApiResponse({
    status: 401,
    description: 'Clave de API inválida o no proporcionada',
  })
  findAllByTenant(@Param('tenantId') tenantId: string) {
    return this.alarmsService.findAllByTenant(tenantId);
  }
}
