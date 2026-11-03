/** Metadados de requisição usados em sessões/auditoria. */
export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
}

/** Principal autenticado (injetado pelo JwtAuthGuard; claims do access token + sessão viva). */
export interface Principal {
  userId: string;
  sessionId: string;
  familyId: string;
}
