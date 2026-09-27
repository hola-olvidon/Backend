import { BadRequestException } from '@nestjs/common';

/**
 * Modelo de recurrencia (unión discriminada) que se guarda en la columna `Alarm.recurrencia` (JSON).
 *
 * `recurrencia == null` ⇒ alarma de una sola vez (usa `horaProgramada`).
 * Los horarios (`hora`, `horaInicio`, `horaFin`) son "HH:mm" (24h) interpretados en la ZONA HORARIA
 * del servidor (ver `src/config/settings.service.ts`). La expansión a instantes concretos la hace el
 * cliente Android (ver `RecurrenceExpander.kt`); este módulo fija el contrato y lo valida.
 */

export type RecurrenceTipo =
  | 'diaria'
  | 'semanal'
  | 'mensual'
  | 'anual'
  | 'intervalo';

export interface RecurrenceBase {
  /** Fecha fin opcional en formato "YYYY-MM-DD" (inclusive). */
  fechaFin?: string;
}

export interface RecurrenceDiaria extends RecurrenceBase {
  tipo: 'diaria';
  /** Hora del día "HH:mm". */
  hora: string;
}

export interface RecurrenceSemanal extends RecurrenceBase {
  tipo: 'semanal';
  /** Días de la semana ISO: 1 = Lunes ... 7 = Domingo. */
  diasSemana: number[];
  hora: string;
}

export interface RecurrenceMensual extends RecurrenceBase {
  tipo: 'mensual';
  /** Días del mes (1..31). Se ajustan al último día del mes si no existe (ej. 31 → 28/30). */
  diasMes: number[];
  hora: string;
}

export interface RecurrenceAnual extends RecurrenceBase {
  tipo: 'anual';
  /** Fechas "MM-DD". Las inválidas (ej. 02-29) se omiten en años no bisiestos. */
  fechas: string[];
  hora: string;
}

export interface RecurrenceIntervalo extends RecurrenceBase {
  tipo: 'intervalo';
  diasSemana: number[];
  /** Inicio del rango horario "HH:mm" (inclusive). */
  horaInicio: string;
  /** Fin del rango horario "HH:mm" (exclusivo, la última ocurrencia es < horaFin). */
  horaFin: string;
  /** Cada cuántos minutos (1..1440). */
  intervaloMinutos: number;
}

export type Recurrence =
  | RecurrenceDiaria
  | RecurrenceSemanal
  | RecurrenceMensual
  | RecurrenceAnual
  | RecurrenceIntervalo;

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;
const MM_DD_RE = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function esObjeto(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertHora(value: unknown, campo: string): string {
  if (typeof value !== 'string' || !HORA_RE.test(value)) {
    throw new BadRequestException(
      `Recurrencia inválida: "${campo}" debe ser una hora "HH:mm" (ej. "09:30")`,
    );
  }
  return value;
}

function assertDiasSemana(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((d) => Number.isInteger(d) && d >= 1 && d <= 7)
  ) {
    throw new BadRequestException(
      'Recurrencia inválida: "diasSemana" debe ser un arreglo no vacío de días 1..7 (1=Lunes .. 7=Domingo)',
    );
  }
  const dias = value.map(Number);
  if (new Set(dias).size !== dias.length) {
    throw new BadRequestException(
      'Recurrencia inválida: "diasSemana" no puede tener días repetidos',
    );
  }
  return dias;
}

function assertDiasMes(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((d) => Number.isInteger(d) && d >= 1 && d <= 31)
  ) {
    throw new BadRequestException(
      'Recurrencia inválida: "diasMes" debe ser un arreglo no vacío de números 1..31',
    );
  }
  return value.map(Number);
}

function assertFechas(value: unknown): string[] {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    !value.every((f) => typeof f === 'string' && MM_DD_RE.test(f))
  ) {
    throw new BadRequestException(
      'Recurrencia inválida: "fechas" debe ser un arreglo no vacío de strings "MM-DD" (ej. "01-05")',
    );
  }
  return value as string[];
}

function assertFechaFin(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || !FECHA_RE.test(value)) {
    throw new BadRequestException(
      'Recurrencia inválida: "fechaFin" debe ser una fecha "YYYY-MM-DD"',
    );
  }
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    throw new BadRequestException(
      'Recurrencia inválida: "fechaFin" no es una fecha válida',
    );
  }
  return value;
}

/**
 * Valida y normaliza un objeto `recurrencia` arbitrario. Devuelve el objeto tipado o lanza
 * `BadRequestException` con un mensaje claro.
 */
export function parseRecurrence(raw: unknown): Recurrence {
  if (!esObjeto(raw)) {
    throw new BadRequestException(
      'Recurrencia inválida: debe ser un objeto JSON con "tipo"',
    );
  }

  const fechaFin = assertFechaFin(raw.fechaFin);

  switch (raw.tipo) {
    case 'diaria':
      return {
        tipo: 'diaria',
        hora: assertHora(raw.hora, 'hora'),
        ...(fechaFin ? { fechaFin } : {}),
      };
    case 'semanal':
      return {
        tipo: 'semanal',
        diasSemana: assertDiasSemana(raw.diasSemana),
        hora: assertHora(raw.hora, 'hora'),
        ...(fechaFin ? { fechaFin } : {}),
      };
    case 'mensual':
      return {
        tipo: 'mensual',
        diasMes: assertDiasMes(raw.diasMes),
        hora: assertHora(raw.hora, 'hora'),
        ...(fechaFin ? { fechaFin } : {}),
      };
    case 'anual':
      return {
        tipo: 'anual',
        fechas: assertFechas(raw.fechas),
        hora: assertHora(raw.hora, 'hora'),
        ...(fechaFin ? { fechaFin } : {}),
      };
    case 'intervalo': {
      const horaInicio = assertHora(raw.horaInicio, 'horaInicio');
      const horaFin = assertHora(raw.horaFin, 'horaFin');
      if (horaFin <= horaInicio) {
        throw new BadRequestException(
          'Recurrencia inválida: "horaFin" debe ser mayor que "horaInicio"',
        );
      }
      const intervaloMinutos = raw.intervaloMinutos;
      if (
        !Number.isInteger(intervaloMinutos) ||
        (intervaloMinutos as number) < 1 ||
        (intervaloMinutos as number) > 1440
      ) {
        throw new BadRequestException(
          'Recurrencia inválida: "intervaloMinutos" debe ser un entero entre 1 y 1440',
        );
      }
      return {
        tipo: 'intervalo',
        diasSemana: assertDiasSemana(raw.diasSemana),
        horaInicio,
        horaFin,
        intervaloMinutos: intervaloMinutos as number,
        ...(fechaFin ? { fechaFin } : {}),
      };
    }
    default:
      throw new BadRequestException(
        'Recurrencia inválida: "tipo" debe ser uno de: diaria, semanal, mensual, anual, intervalo',
      );
  }
}

// --- Utilidades para expandir horarios a instantes concretos (referencia / tests) ---

/** Offset (ms) de la zona `timeZone` en el instante `utcMillis` (positivo = zona al este de UTC). */
function offsetMs(timeZone: string, utcMillis: number): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(utcMillis))) {
    parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) % 24,
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - utcMillis;
}

/** Convierte una hora local (wall-clock) en la zona `timeZone` a epoch ms (con doble pasada por DST). */
function wallClockToEpochMs(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const off1 = offsetMs(timeZone, asUtc);
  const off2 = offsetMs(timeZone, asUtc - off1);
  return asUtc - off2;
}

function parseHora(hora: string): { h: number; m: number } {
  const [h, m] = hora.split(':').map(Number);
  return { h, m };
}

interface CivilDate {
  y: number;
  m: number;
  d: number;
}

/** Fecha civil (año/mes/día) en la zona `timeZone` para un instante dado. */
function civilDate(epochMs: number, timeZone: string): CivilDate {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(epochMs))) {
    parts[p.type] = p.value;
  }
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

/** Día de la semana ISO (1=Lunes .. 7=Domingo) a partir de una fecha civil. */
function isoDayOfWeek(c: CivilDate): number {
  const utcDay = new Date(Date.UTC(c.y, c.m - 1, c.d)).getUTCDay(); // 0=Dom .. 6=Sáb
  return ((utcDay + 6) % 7) + 1;
}

function addDays(c: CivilDate, n: number): CivilDate {
  const d = new Date(Date.UTC(c.y, c.m - 1, c.d + n));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

/** Días que tiene el mes `month` (1..12) del año `year`. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Expande una recurrencia a los próximos instantes (epoch ms) posteriores a `fromMs`, en la zona
 * `timeZone`, hasta `maxCount`. Es la implementación de referencia; el Android replica este contrato.
 */
export function nextOccurrences(
  recurrence: Recurrence,
  fromMs: number,
  timeZone: string,
  maxCount = 20,
): number[] {
  const result: number[] = [];

  const limiteMs = recurrence.fechaFin
    ? wallClockToEpochMs(
        Number(recurrence.fechaFin.slice(0, 4)),
        Number(recurrence.fechaFin.slice(5, 7)),
        Number(recurrence.fechaFin.slice(8, 10)),
        23,
        59,
        timeZone,
      )
    : Number.POSITIVE_INFINITY;

  const push = (ms: number) => {
    if (ms <= fromMs) return;
    if (ms > limiteMs) return;
    if (result.length >= maxCount) return;
    result.push(ms);
  };

  // Empezamos un día antes de "hoy" para no perder la ocurrencia del día actual.
  const start = addDays(civilDate(fromMs, timeZone), -1);

  switch (recurrence.tipo) {
    case 'diaria': {
      const { h, m } = parseHora(recurrence.hora);
      for (let i = 0; result.length < maxCount && i < 400; i++) {
        const c = addDays(start, i);
        push(wallClockToEpochMs(c.y, c.m, c.d, h, m, timeZone));
      }
      break;
    }
    case 'semanal': {
      const { h, m } = parseHora(recurrence.hora);
      const dias = new Set(recurrence.diasSemana);
      for (let i = 0; result.length < maxCount && i < 400; i++) {
        const c = addDays(start, i);
        if (!dias.has(isoDayOfWeek(c))) continue;
        push(wallClockToEpochMs(c.y, c.m, c.d, h, m, timeZone));
      }
      break;
    }
    case 'mensual': {
      const { h, m } = parseHora(recurrence.hora);
      const absStart = start.y * 12 + (start.m - 1);
      for (let i = 0; result.length < maxCount && i < 48; i++) {
        const abs = absStart + i;
        const year = Math.floor(abs / 12);
        const month = (abs % 12) + 1;
        const maxDia = daysInMonth(year, month);
        for (const dia of recurrence.diasMes) {
          push(wallClockToEpochMs(year, month, Math.min(dia, maxDia), h, m, timeZone));
        }
      }
      break;
    }
    case 'anual': {
      const { h, m } = parseHora(recurrence.hora);
      for (let i = 0; result.length < maxCount && i < 6; i++) {
        const year = start.y + i;
        for (const fecha of recurrence.fechas) {
          const mes = Number(fecha.slice(0, 2));
          const dia = Number(fecha.slice(3, 5));
          if (dia > daysInMonth(year, mes)) continue; // p. ej. 02-29 en año no bisiesto
          push(wallClockToEpochMs(year, mes, dia, h, m, timeZone));
        }
      }
      break;
    }
    case 'intervalo': {
      const { h: hi, m: mi } = parseHora(recurrence.horaInicio);
      const { h: hf, m: mf } = parseHora(recurrence.horaFin);
      const dias = new Set(recurrence.diasSemana);
      for (let i = 0; result.length < maxCount && i < 400; i++) {
        const c = addDays(start, i);
        if (!dias.has(isoDayOfWeek(c))) continue;
        const inicio = wallClockToEpochMs(c.y, c.m, c.d, hi, mi, timeZone);
        const fin = wallClockToEpochMs(c.y, c.m, c.d, hf, mf, timeZone);
        for (
          let t = inicio;
          t < fin && result.length < maxCount;
          t += recurrence.intervaloMinutos * 60000
        ) {
          push(t);
        }
      }
      break;
    }
  }

  return result.sort((a, b) => a - b).slice(0, maxCount);
}
