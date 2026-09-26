import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/client/client';
import { CreateAlarmDto } from './dto/create-alarm.dto';
import { UpdateAlarmDto } from './dto/update-alarm.dto';
import { parseRecurrence } from './recurrence';

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

    const { recurrencia, horaProgramada } = this.resolveSchedule(createAlarmDto);

    const data: any = {
      tenantId: createAlarmDto.tenantId,
      titulo: createAlarmDto.titulo,
      horaProgramada,
      urlAudio: createAlarmDto.urlAudio,
      activa: createAlarmDto.activa,
    };
    if (recurrencia !== null) {
      data.recurrencia = recurrencia;
    }

    return this.prisma.alarm.create({ data });
  }

  // Actualizar una alarma por ID
  async update(id: string, updateAlarmDto: UpdateAlarmDto) {
    await this.findOne(id); // Valida existencia

    const dataToUpdate: any = { ...updateAlarmDto };

    // Si envían fecha, convertir a objeto Date
    if (updateAlarmDto.horaProgramada) {
      dataToUpdate.horaProgramada = new Date(updateAlarmDto.horaProgramada);
    }

    // Validar/normalizar recurrencia si viene
    if (updateAlarmDto.recurrencia !== undefined) {
      dataToUpdate.recurrencia = updateAlarmDto.recurrencia
        ? parseRecurrence(updateAlarmDto.recurrencia)
        : Prisma.JsonNull;
    }

    return this.prisma.alarm.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  /**
   * Resuelve el esquema de la alarma a guardar: o bien `recurrencia` (validada/normalizada) o bien
   * `horaProgramada`. Exige exactamente una de las dos y devuelve los campos listos para Prisma.
   */
  private resolveSchedule(dto: CreateAlarmDto): {
    recurrencia: Record<string, unknown> | null;
    horaProgramada: Date | null;
  } {
    const tieneRecurrencia = dto.recurrencia !== undefined && dto.recurrencia !== null;
    const tieneFecha = dto.horaProgramada !== undefined && dto.horaProgramada !== null;

    if (tieneRecurrencia && tieneFecha) {
      throw new BadRequestException(
        'Envía "recurrencia" o "horaProgramada", no ambas a la vez',
      );
    }
    if (!tieneRecurrencia && !tieneFecha) {
      throw new BadRequestException(
        'Debe enviar "recurrencia" (alarma recurrente) o "horaProgramada" (alarma de una sola vez)',
      );
    }

    if (tieneRecurrencia) {
      return {
        recurrencia: parseRecurrence(dto.recurrencia) as unknown as Record<string, unknown>,
        horaProgramada: null,
      };
    }

    return {
      recurrencia: null,
      horaProgramada: new Date(dto.horaProgramada as string),
    };
  }

  // Eliminar una alarma por ID
  async remove(id: string) {
    await this.findOne(id); // Valida existencia

    return this.prisma.alarm.delete({
      where: { id },
    });
  }
}
