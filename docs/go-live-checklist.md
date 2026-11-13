# iFastFood — Checklist de Go-Live & Hardening de Produção

Este checklist deve ser integralmente validado antes de abrir a plataforma para tráfego comercial público.

---

## 1. Gestão de Segredos & Variáveis de Ambiente

| Variável | Descrição | Status Pré-Launch |
|---|---|:---:|
| `DATABASE_URL` | String de conexão em pooler do Supabase (PgBouncer porta 6543) | [ ] |
| `DIRECT_URL` | String de conexão direta (porta 5432) para migrations | [ ] |
| `JWT_PRIVATE_KEY` | Chave privada RSA 2048/4096-bit PEM para assinatura de tokens | [ ] |
| `JWT_PUBLIC_KEY` | Chave pública RSA para validação em microsserviços/gateways | [ ] |
| `IDENTITY_FIELD_KEY` | Chave simétrica 32 bytes (AES-256) para cifra de campos de identidade | [ ] |
| `STRIPE_SECRET_KEY` | Chave secreta de produção da Stripe (`sk_live_...`) | [ ] |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura de webhooks da Stripe (`whsec_...`) | [ ] |
| `REDIS_URL` | Conexão com cluster Redis de produção com autenticação TLS/AUTH | [ ] |

---

## 2. Segurança de Borda & Infraestrutura

- [ ] **Terminação SSL/TLS:** Certificados TLS 1.3 ativos em todos os domínios públicos (`api.ifastfood.com.br`, `admin.ifastfood.com.br`, `ifastfood.com.br`).
- [ ] **Configuração de CORS:** Origens restritas estritamente aos domínios autorizados (sem `*` em produção).
- [ ] **Rate Limiting:** Ativação de rate limiting por IP/Token no gateway reverso para proteção contra brute force e ataques de negação de serviço.
- [ ] **Headers de Segurança HTTP:** `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Content-Security-Policy`.

---

## 3. Banco de Dados & Integridade Contábil

- [ ] **Migrations Aplicadas:** Validar `npx prisma migrate status` apontando zero migrations pendentes.
- [ ] **Backups Automáticos:** PITR (Point-in-Time Recovery) ativo no projeto Supabase com retenção mínima de 7 dias.
- [ ] **Auditoria de Partidas Dobradas:** Teste de fechamento diário do livro-razão (`assertBalancedEntries`) configurado em cronjob para notificar o financeiro caso haja qualquer discrepância de centavos.

---

## 4. Observabilidade & Monitoramento

- [ ] **Healthchecks Ativos:**
  - Liveness: `GET https://api.ifastfood.com.br/health/live` (retorna HTTP 200 se o processo responde).
  - Readiness: `GET https://api.ifastfood.com.br/health/ready` (retorna HTTP 200 se DB e Redis respondem).
- [ ] **APM & Rastreamento de Erros:** Integração do Sentry ativada no backend NestJS e nos frontends Next.js.
- [ ] **Alertas Críticos:** Configurar alertas no PagerDuty/Slack para erros 5xx acima de 1% e latência p99 > 1500ms.

---

## 5. Testes Finais de Qualidade

- [ ] Todos os testes unitários de domínio passando (cobertura >= 85%).
- [ ] Todos os testes da API passando (0 falhas).
- [ ] Teste de carga k6 executado com sucesso e p95 < 500ms.
- [ ] Verificação de compatibilidade dos apps nativos Kotlin e Swift compilando contra a última especificação OpenAPI.
