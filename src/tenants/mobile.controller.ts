import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiSecurity, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TenantsService } from './tenants.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

/**
 * Endpoints específicos de la app móvil, protegidos con X-API-KEY.
 * Ruta base distinta a la de los endpoints de administrador para no chocar.
 */
@ApiTags('mobile')
@Controller('mobile')
export class MobileController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('tenants')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiOperation({
    summary: 'Listar tenants disponibles para suscribirse (App Móvil)',
  })
  @ApiResponse({ status: 200, description: 'Lista de tenants (id y nombre)' })
  @ApiResponse({
    status: 401,
    description: 'Clave de API inválida o no proporcionada',
  })
  listTenants() {
    return this.tenantsService.findAllPublic();
  }
}
