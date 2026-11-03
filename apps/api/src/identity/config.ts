/**
 * Parâmetros de autenticação (defaults de F1; afinamento por env na F5).
 * Tamanhos alinhados ao plano de segurança §7 e ao iFood real
 * (access curto ~15min, refresh deslizante ~30d, OTP ~5min).
 */

/** Access token JWT (RS256). */
export const ACCESS_TTL_SECONDS = 15 * 60;

/** Token intermediário quando 2FA é exigido no login. */
export const MFA_TTL_SECONDS = 5 * 60;

/** Refresh token deslizante (renova a cada rotação). */
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Janela de vida de um código OTP. */
export const OTP_TTL_MS = 5 * 60 * 1000;

/** Tentativas erradas antes de consumir o desafio OTP. */
export const OTP_MAX_ATTEMPTS = 5;

/** Pepper para hash de códigos OTP (rotativo; nunca logar). */
export const OTP_PEPPER = process.env.OTP_PEPPER ?? 'ifastfood-dev-pepper-rotate-me';

/** Papel com bypass de permissões granulares no backoffice. */
export const ADMIN_BYPASS_ROLE = 'ADMIN';

/** Versão corrente dos termos LGPD embutida nos consentamentos. */
export const LGPD_TERMS_VERSION = 'v1';
