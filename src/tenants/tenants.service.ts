import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class TenantsService {
  constructor(private prisma: PrismaService) {}

  // Muestra los tenants e incluye sus alarmas
  findAll() {
    return this.prisma.tenant.findMany({
      include: { alarms: true },
    });
  }

  // Listado público para la app móvil (solo id y nombre, sin password ni alarmas)
  findAllPublic() {
    return this.prisma.tenant.findMany({
      select: { id: true, nombre: true },
      orderBy: { creadoEn: 'asc' },
    });
  }

  // Obtener un tenant por ID (sin exponer la contraseña)
  async findOne(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        creadoEn: true,
        alarms: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant con ID "${id}" no encontrado`);
    }

    return tenant;
  }

  // Crear un tenant
  async create(createTenantDto: CreateTenantDto) {
    const data = { ...createTenantDto };

    // Si viene una contraseña, la encriptamos antes de guardar
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    const tenant = await this.prisma.tenant.create({ data });

    // Omitimos el password del objeto retornado
    const { password, ...result } = tenant;
    return result;
  }

  // Actualizar un tenant por ID
  async update(id: string, updateTenantDto: UpdateTenantDto) {
    // Primero verificamos si el tenant existe
    await this.findOne(id);

    const data = { ...updateTenantDto };

    // Si envían un nuevo password en la actualización, también lo encriptamos
    if (data.password) {
      const saltRounds = 10;
      data.password = await bcrypt.hash(data.password, saltRounds);
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
    });
  }

  // Eliminar un tenant por ID
  async remove(id: string) {
    // Primero verificamos si el tenant existe
    await this.findOne(id);

    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}
