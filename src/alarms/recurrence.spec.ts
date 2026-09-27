import { BadRequestException } from '@nestjs/common';
import { parseRecurrence, nextOccurrences } from './recurrence';

describe('parseRecurrence', () => {
  it('valida una recurrencia diaria', () => {
    expect(parseRecurrence({ tipo: 'diaria', hora: '07:00' })).toEqual({
      tipo: 'diaria',
      hora: '07:00',
    });
  });

  it('valida una recurrencia semanal', () => {
    expect(
      parseRecurrence({ tipo: 'semanal', diasSemana: [1, 2, 3, 4, 5], hora: '07:00' }),
    ).toEqual({ tipo: 'semanal', diasSemana: [1, 2, 3, 4, 5], hora: '07:00' });
  });

  it('valida una recurrencia intervalo con fechaFin', () => {
    const r = parseRecurrence({
      tipo: 'intervalo',
      diasSemana: [1, 3, 5],
      horaInicio: '09:30',
      horaFin: '12:00',
      intervaloMinutos: 3,
      fechaFin: '2026-12-31',
    });
    expect(r).toMatchObject({ tipo: 'intervalo', intervaloMinutos: 3, fechaFin: '2026-12-31' });
  });

  it('rechaza hora mal formada', () => {
    expect(() => parseRecurrence({ tipo: 'diaria', hora: '25:00' })).toThrow(
      BadRequestException,
    );
  });

  it('rechaza diasSemana fuera de rango', () => {
    expect(() =>
      parseRecurrence({ tipo: 'semanal', diasSemana: [0], hora: '07:00' }),
    ).toThrow(BadRequestException);
  });

  it('rechaza diasSemana vacío', () => {
    expect(() =>
      parseRecurrence({ tipo: 'semanal', diasSemana: [], hora: '07:00' }),
    ).toThrow(BadRequestException);
  });

  it('rechaza horaFin <= horaInicio en intervalo', () => {
    expect(() =>
      parseRecurrence({
        tipo: 'intervalo',
        diasSemana: [1],
        horaInicio: '12:00',
        horaFin: '09:00',
        intervaloMinutos: 10,
      }),
    ).toThrow(BadRequestException);
  });

  it('rechaza tipo desconocido', () => {
    expect(() => parseRecurrence({ tipo: 'raro' })).toThrow(BadRequestException);
  });

  it('rechaza no-objeto', () => {
    expect(() => parseRecurrence('diaria')).toThrow(BadRequestException);
  });
});

describe('nextOccurrences', () => {
  // 2026-09-28 es lunes (UTC).
  const from = Date.UTC(2026, 8, 28, 0, 0, 0);

  it('diaria genera una ocurrencia por día', () => {
    const rec = parseRecurrence({ tipo: 'diaria', hora: '07:00' });
    const occ = nextOccurrences(rec, from, 'UTC', 3);
    expect(occ).toEqual([
      Date.UTC(2026, 8, 28, 7, 0),
      Date.UTC(2026, 8, 29, 7, 0),
      Date.UTC(2026, 8, 30, 7, 0),
    ]);
  });

  it('semanal respeta los días indicados (lun/mié/vie)', () => {
    const rec = parseRecurrence({
      tipo: 'semanal',
      diasSemana: [1, 3, 5],
      hora: '07:00',
    });
    const occ = nextOccurrences(rec, from, 'UTC', 4);
    // 28=lun, 30=mié, 2=vie (oct)
    expect(occ).toEqual([
      Date.UTC(2026, 8, 28, 7, 0),
      Date.UTC(2026, 8, 30, 7, 0),
      Date.UTC(2026, 9, 2, 7, 0),
      Date.UTC(2026, 9, 5, 7, 0),
    ]);
  });

  it('mensual ajusta el día al último del mes', () => {
    const rec = parseRecurrence({ tipo: 'mensual', diasMes: [31], hora: '08:00' });
    const occ = nextOccurrences(rec, from, 'UTC', 3);
    // sep tiene 30 (31→30), oct 31, nov 30 (31→30)
    expect(occ).toEqual([
      Date.UTC(2026, 8, 30, 8, 0),
      Date.UTC(2026, 9, 31, 8, 0),
      Date.UTC(2026, 10, 30, 8, 0),
    ]);
  });

  it('anual genera una vez por año', () => {
    const rec = parseRecurrence({ tipo: 'anual', fechas: ['01-05'], hora: '08:00' });
    const occ = nextOccurrences(rec, from, 'UTC', 2);
    expect(occ).toEqual([
      Date.UTC(2027, 0, 5, 8, 0),
      Date.UTC(2028, 0, 5, 8, 0),
    ]);
  });

  it('intervalo genera cada N minutos dentro del rango', () => {
    const rec = parseRecurrence({
      tipo: 'intervalo',
      diasSemana: [1],
      horaInicio: '09:00',
      horaFin: '09:10',
      intervaloMinutos: 3,
    });
    // 28/09/2026 es lunes.
    const occ = nextOccurrences(rec, from, 'UTC', 4);
    expect(occ).toEqual([
      Date.UTC(2026, 8, 28, 9, 0),
      Date.UTC(2026, 8, 28, 9, 3),
      Date.UTC(2026, 8, 28, 9, 6),
      Date.UTC(2026, 8, 28, 9, 9),
    ]);
  });

  it('respeta fechaFin', () => {
    const rec = parseRecurrence({ tipo: 'diaria', hora: '07:00', fechaFin: '2026-09-29' });
    const occ = nextOccurrences(rec, from, 'UTC', 10);
    expect(occ).toEqual([
      Date.UTC(2026, 8, 28, 7, 0),
      Date.UTC(2026, 8, 29, 7, 0),
    ]);
  });
});
