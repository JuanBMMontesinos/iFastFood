import { describe, expect, it } from 'vitest';
import {
  isOpenNow,
  minutesToTime,
  openAtMinutes,
  timeToMinutes,
  type BusinessWindow,
} from './hours';

describe('conversões de horário', () => {
  it('timeToMinutes/minutesToTime roundtrip', () => {
    expect(timeToMinutes('00:00')).toBe(0);
    expect(timeToMinutes('10:30')).toBe(630);
    expect(timeToMinutes('23:59')).toBe(1439);
    expect(minutesToTime(630)).toBe('10:30');
    expect(minutesToTime(1440)).toBe('24:00');
  });

  it('rejeita horários inválidos', () => {
    expect(() => timeToMinutes('9:99')).toThrow();
    expect(() => timeToMinutes('24:00')).toThrow();
    expect(() => timeToMinutes('abc')).toThrow();
    expect(() => minutesToTime(1441)).toThrow();
    expect(() => minutesToTime(-1)).toThrow();
  });
});

describe('isOpenNow', () => {
  const sameDay: BusinessWindow[] = [{ weekday: 3, openMinutes: 600, closeMinutes: 1320 }];

  it('aberto dentro da janela e nas bordas [open, close)', () => {
    expect(isOpenNow(sameDay, 3, 600)).toBe(true);
    expect(isOpenNow(sameDay, 3, 960)).toBe(true);
    expect(isOpenNow(sameDay, 3, 1319)).toBe(true);
    expect(isOpenNow(sameDay, 3, 1320)).toBe(false);
    expect(isOpenNow(sameDay, 3, 599)).toBe(false);
    expect(isOpenNow(sameDay, 4, 600)).toBe(false);
  });

  it('janela noturna atravessa a meia-noite', () => {
    // 18:00 → 03:00 (0d, terça→quarta ex.): open 1080, close 180
    const night: BusinessWindow[] = [{ weekday: 0, openMinutes: 1080, closeMinutes: 180 }];
    expect(isOpenNow(night, 0, 1080)).toBe(true); // abre 18h
    expect(isOpenNow(night, 0, 1439)).toBe(true); // 23:59
    expect(isOpenNow(night, 0, 900)).toBe(false); // meio-dia fechado
    expect(isOpenNow(night, 1, 60)).toBe(true); // 01:00 de segunda ainda aberta
    expect(isOpenNow(night, 1, 180)).toBe(false); // fecha exatamente 03:00
    expect(isOpenNow(night, 1, 181)).toBe(false);
  });

  it('múltiplas janelas por dia (almoço + jantar)', () => {
    const windows: BusinessWindow[] = [
      { weekday: 5, openMinutes: 660, closeMinutes: 900 }, // 11:00–15:00
      { weekday: 5, openMinutes: 1080, closeMinutes: 1380 }, // 18:00–23:00
    ];
    expect(isOpenNow(windows, 5, 700)).toBe(true);
    expect(isOpenNow(windows, 5, 1000)).toBe(false);
    expect(isOpenNow(windows, 5, 1200)).toBe(true);
    expect(isOpenNow(windows, 6, 700)).toBe(false);
  });
});

describe('openAtMinutes', () => {
  it('menor abertura do dia', () => {
    const windows: BusinessWindow[] = [
      { weekday: 2, openMinutes: 660, closeMinutes: 900 },
      { weekday: 2, openMinutes: 480, closeMinutes: 540 },
    ];
    expect(openAtMinutes(windows, 2)).toBe(480);
  });

  it('janela noturna do dia anterior abre 00:00', () => {
    const windows: BusinessWindow[] = [{ weekday: 1, openMinutes: 1200, closeMinutes: 240 }];
    expect(openAtMinutes(windows, 2)).toBe(0);
  });

  it('null quando fechado o dia inteiro', () => {
    expect(openAtMinutes([], 1)).toBeNull();
    expect(openAtMinutes([{ weekday: 0, openMinutes: 600, closeMinutes: 700 }], 1)).toBeNull();
  });
});
