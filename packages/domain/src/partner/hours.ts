/**
 * Horários de funcionamento do parceiro — regras puras.
 *
 * Janela: `weekday` (0 = domingo … 6 = sábado), `openMinutes`/`closeMinutes`
 * em minutos desde 00:00 do día local (São Paulo). Janelas que fecham depois
 * da meia-noite (close <= open — ex. 18:00 → 02:00(+) atravessam o dia
 * seguinte e cobrem também a manhã do dia posterior.
 */
export interface BusinessWindow {
  weekday: number; // 0..6
  openMinutes: number; // 0..1439
  closeMinutes: number; // 1..1440
}

/** '10:30' → 630; valida HH:mm. */
export function timeToMinutes(time: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) throw new DomainTimeError(`Horário inválido: "${time}" (use HH:mm)`);
  const h = Number(m[1]);
  const s = Number(m[2]);
  if (h > 23 || s > 59) throw new DomainTimeError(`Horário inválido: "${time}"`);
  return h * 60 + s;
}

/** 630 → '10:30' (1 dígito de hora quando < 10). */
export function minutesToTime(minutes: number): string {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) {
    throw new DomainTimeError(`Minutos inválidos: ${minutes}`);
  }
  const h = Math.floor(minutes / 60);
  const s = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export class DomainTimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainTimeError';
  }
}

/**
 * Loja está aberta AGORA (dado o instante convertido em weekday + minuto).
 * - Dentro do mesmo dia:  [open, close) — fechado exatamente no minuto close.
 * - Janela noturna (close <= open): aberta de open→24:00 no dia e 00:00→close no dia seguinte.
 */
export function isOpenNow(windows: BusinessWindow[], weekday: number, minuteOfDay: number): boolean {
  const prevWeekday = (weekday + 6) % 7;
  for (const w of windows) {
    if (w.openMinutes < w.closeMinutes) {
      if (w.weekday === weekday && minuteOfDay >= w.openMinutes && minuteOfDay < w.closeMinutes) {
        return true;
      }
    } else {
      // Janela noturna: parte no próprio dia (open → 1440).
      if (w.weekday === weekday && minuteOfDay >= w.openMinutes) return true;
      // Parte no dia seguinte (0 → close).
      if (w.weekday === prevWeekday && minuteOfDay < w.closeMinutes) return true;
    }
  }
  return false;
}

/**
 * Horário de ABERTURA mais cedo do dia (min) — para "abre às X" na UI.
 * Considera janelas que começam no próprio dia OR janela noturna do dia
 * anterior que ainda cobre 00:00. Retorna null quando fechado o dia inteiro.
 */
export function openAtMinutes(windows: BusinessWindow[], weekday: number): number | null {
  const prevWeekday = (weekday + 6) % 7;
  let best: number | null = null;
  for (const w of windows) {
    if (w.weekday === weekday) {
      best = best === null ? w.openMinutes : Math.min(best, w.openMinutes);
    } else if (w.weekday === prevWeekday && w.closeMinutes <= w.openMinutes && w.closeMinutes > 0) {
      // Cobre a madrugada deste dia (começou "ontem").
      best = best === null ? 0 : Math.min(best, 0);
    }
  }
  return best;
}
