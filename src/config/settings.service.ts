import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const CLAVE_ZONA_HORARIA = 'zonaHoraria';
const ZONA_HORARIA_DEFAULT = 'UTC';

/** Zonas horarias IANA soportadas por el runtime (Node 16+). */
function zonasHorariasSoportadas(): Set<string> | null {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] })
    .supportedValuesOf;
  if (typeof fn !== 'function') return null;
  try {
    return new Set(fn.call(Intl, 'timeZone'));
  } catch {
    return null;
  }
}

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService) {}

  /** Devuelve la zona horaria del servidor (crea el valor por defecto si no existe). */
  async getZonaHoraria(): Promise<string> {
    const config = await this.prisma.configuracion.findUnique({
      where: { clave: CLAVE_ZONA_HORARIA },
    });
    if (config) return config.valor;

    await this.prisma.configuracion.create({
      data: { clave: CLAVE_ZONA_HORARIA, valor: ZONA_HORARIA_DEFAULT },
    });
    return ZONA_HORARIA_DEFAULT;
  }

  /** Devuelve la configuración pública (zona horaria) para el panel y la app móvil. */
  async getConfig(): Promise<{ zonaHoraria: string }> {
    return { zonaHoraria: await this.getZonaHoraria() };
  }

  /** Actualiza la zona horaria del servidor (validando que sea una zona IANA válida). */
  async setZonaHoraria(zonaHoraria: string): Promise<{ zonaHoraria: string }> {
    const valor = zonaHoraria.trim();
    if (!valor) {
      throw new BadRequestException('La zona horaria no puede estar vacía');
    }

    const soportadas = zonasHorariasSoportadas();
    if (soportadas && !soportadas.has(valor)) {
      throw new BadRequestException(
        `Zona horaria inválida: "${valor}". Debe ser una zona IANA válida (ej. America/Santiago)`,
      );
    }

    await this.prisma.configuracion.upsert({
      where: { clave: CLAVE_ZONA_HORARIA },
      update: { valor },
      create: { clave: CLAVE_ZONA_HORARIA, valor },
    });

    return { zonaHoraria: valor };
  }
}
