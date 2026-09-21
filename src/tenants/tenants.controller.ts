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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiSecurity,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  // ENDPOINTS DEL ADMINISTRADOR
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Crear un nuevo tenant (Admin)' })
  @ApiResponse({ status: 201, description: 'Tenant creado exitosamente' })
  @ApiResponse({
    status: 401,
    description: 'No autorizado (JWT inválido o ausente)',
  })
  create(@Body() createTenantDto: CreateTenantDto) {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Listar todos los tenants (Admin)' })
  @ApiResponse({ status: 200, description: 'Lista de todos los tenants' })
  @ApiResponse({ status: 401, description: 'No autorizado' })
  findAll() {
    return this.tenantsService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Actualizar los datos de un tenant (Admin)' })
  @ApiResponse({ status: 200, description: 'Tenant actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tenant no encontrado' })
  update(@Param('id') id: string, @Body() updateTenantDto: UpdateTenantDto) {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Eliminar un tenant y sus datos asociados (Admin)' })
  @ApiResponse({ status: 200, description: 'Tenant eliminado exitosamente' })
  @ApiResponse({ status: 404, description: 'Tenant no encontrado' })
  remove(@Param('id') id: string) {
    return this.tenantsService.remove(id);
  }

  // ENDPOINTS DE LA APP MÓVIL (X-API-KEY)
  @Get(':id')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Obtener datos de un tenant específico (App Móvil)',
  })
  @ApiResponse({ status: 200, description: 'Datos del tenant solicitados' })
  @ApiResponse({ status: 401, description: 'Clave de API no válida o ausente' })
  @ApiResponse({ status: 404, description: 'Tenant no encontrado' })
  findOne(@Param('id') id: string) {
    return this.tenantsService.findOne(id);
  }
}
