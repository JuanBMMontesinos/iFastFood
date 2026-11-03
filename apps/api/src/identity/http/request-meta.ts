import type { Request } from 'express';
import type { RequestMeta } from '../types';

/** ip + user-agent canonizados para sessões/auditoria. */
export function requestMeta(request: Request): RequestMeta {
  return {
    ip: request.ip ?? request.socket?.remoteAddress ?? null,
    userAgent: request.headers['user-agent'] ?? null,
  };
}
