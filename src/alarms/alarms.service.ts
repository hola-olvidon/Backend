import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';

@Injectable()
export class AlarmsService {
  constructor(private prisma: PrismaService) {}

  // Listar todas las alarmas
  findAll() {
    return this.prisma.alarm.findMany({
      include: { tenant: true }, // Incluye datos del Tenant
    });
  }

  // Listar alarmas de un Tenant en particular
  findAllByTenant(tenantId: string) {
    return this.prisma.alarm.findMany({
      where: { tenantId },
    });
  }

  // Buscar una alarma por ID
  async findOne(id: string) {
    const alarm = await this.prisma.alarm.findUnique({
      where: { id },
      include: { tenant: true },
    });

    if (!alarm) {
      throw new NotFoundException(`Alarma con ID "${id}" no encontrada`);
    }

    return alarm;
  }

  // Crear una nueva alarma
  async create(createAlarmDto: CreateAlarmDto) {
    // Validar primero si el tenant existe
    const tenantExists = await this.prisma.tenant.findUnique({
      where: { id: createAlarmDto.tenantId },
    });

    if (!tenantExists) {
      throw new NotFoundException(
        `El Tenant con ID "${createAlarmDto.tenantId}" no existe`,
      );
    }

    return this.prisma.alarm.create({
      data: {
        tenantId: createAlarmDto.tenantId,
        titulo: createAlarmDto.titulo,
        horaProgramada: new Date(createAlarmDto.horaProgramada),
        urlAudio: createAlarmDto.urlAudio,
        activa: createAlarmDto.activa,
      },
    });
  }

  // Actualizar una alarma por ID
  async update(id: string, updateAlarmDto: UpdateAlarmDto) {
    await this.findOne(id); // Valida existencia

    const dataToUpdate: any = { ...updateAlarmDto };

    // Si envían fecha, convertir a objeto Date
    if (updateAlarmDto.horaProgramada) {
      dataToUpdate.horaProgramada = new Date(updateAlarmDto.horaProgramada);
    }

    return this.prisma.alarm.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  // Eliminar una alarma por ID
  async remove(id: string) {
    await this.findOne(id); // Valida existencia

    return this.prisma.alarm.delete({
      where: { id },
    });
  }
}
