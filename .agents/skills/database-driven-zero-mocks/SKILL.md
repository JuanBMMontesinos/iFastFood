---
name: database-driven-zero-mocks
description: Garante que nenhuma informação seja mockada ou chumbada em código estático (HTML, TS, TXT), exigindo que todos os dados de exemplo, métricas, páginas CMS, catálogos e filas venham exclusivamente do banco de dados no Supabase. Toda vez que uma nova tabela for criada, ela deve ser obrigatoriamente preenchida com dados de exemplo no Supabase.
---

# Diretriz Inegociável: Zero Mocks & Dados 100% Orientados ao Supabase

Esta skill estabelece que **sob nenhuma circunstância** devem existir dados estáticos, dados mockados ou informações chumbadas nos aplicativos do iFastFood (`apps/admin`, `apps/web-landing`, `apps/api`, etc.), e que **toda e qualquer tabela do banco de dados deve conter dados reais de exemplo**.

## 1. Princípios Fundamentais

1. **Zero Mocks no Frontend:**
   - Componentes React/Next.js não devem conter arrays estáticos de exemplo (como `const mockKyc = [...]`, `const metrics = [...]`, `const ledgerRecords = [...]` ou `FALLBACK_PAGES`).
   - Todos os dados exibidos nas telas devem ser carregados dinamicamente via `fetch` a partir dos endpoints da API NestJS.

2. **Persistência Centralizada no Supabase:**
   - Todos os dados de exemplo, demonstração e catálogo do iFastFood devem estar gravados em suas respectivas tabelas no Supabase (PostgreSQL 16) através do Prisma:
     - `CmsPage`: conteúdo de páginas institucionais e SEO.
     - `AppConfig`: métricas públicas, configurações e taxas globais da plataforma.
     - `Merchant` & `MerchantDocument`: restaurantes ativos e restaurantes em fila de aprovação KYC.
     - `Courier` & `CourierDocument`: entregadores ativos, dados de telemetria GPS e fila KYC.
     - `Order`, `OrderItem`, `Delivery`, `Payment`: pedidos reais, rotas e transações.
     - `LedgerAccount` & `LedgerEntry`: partidas dobradas registradas para cada transação contábil.
     - `Coupon`: regras e códigos de cupons de marketing.
     - `Rating`: avaliações com recálculo de média móvel ponderada.
     - `SupportTicket` & `TicketMessage`: chamados de suporte abertos.

3. **Manutenção do Seed Oficial:**
   - O arquivo `apps/api/prisma/seed.ts` é a fonte oficial para popular o Supabase com dados realistas completos para todas as superfícies.
   - Sempre que uma nova funcionalidade for adicionada, seu modelo deve receber dados representativos no banco, nunca um array estático no frontend.

4. **Tratamento de Estado Vazio e Carregamento:**
   - O frontend deve exibir skeletons ou estados de carregamento (`loading`) e estados vazios apropriados (`empty state`) quando não houver registros retornados pelo banco de dados, em vez de recorrer a dados falsos.

5. **Regra Obrigatória: População Imediata de Novas Tabelas (Zero Tabelas Vazias):**
   - **Toda vez que uma nova tabela for criada** no schema do banco de dados (`apps/api/prisma/schema.prisma` ou migrations):
     1. O desenvolvedor/agente DEVE incluir imediatamente um bloco de inserção/upsert de dados de exemplo no arquivo `apps/api/prisma/seed.ts`.
     2. O script de seed deve ser executado diretamente no banco do Supabase (`pnpm --filter @ifastfood/api exec tsx prisma/seed.ts`).
     3. **Nenhuma tabela deve permanecer com 0 registros no banco de dados.**
     4. Os dados criados devem possuir integridade relacional estrita (foreign keys válidas com entidades pais, enums corretos e valores monetários em `MoneyCents`).

