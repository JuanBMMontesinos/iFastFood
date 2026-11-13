---
name: project-planning
description: >-
  Mantém o planejamento mestre do iFastFood atualizado, registrando o progresso
  de cada fase (F0 a F7), decisões de arquitetura e garantindo rastreabilidade
  para que o contexto do projeto nunca se perca.
---

# Project Planning & Roadmap Sync — iFastFood

## Objetivo
Garantir que todo o roadmap, decisões de produto e estado de execução do iFastFood
permaneçam documentados, versionados no Git e sincronizados no repositório.

## Fonte Única da Verdade
- Documento mestre do plano: `docs/plano-ifastfood.md`
- ADRs de arquitetura: `docs/adr/`
- Histórico de fases e decisões: atualizado a cada conclusão de tarefa ou transição de fase.

## Regras Obrigatórias para Qualquer Agente
1. **Nunca depender de arquivos locais fora do repositório** (ex: pastas em C:\Users\...).
2. **Ao concluir tarefas de uma fase:**
   - Atualizar a tabela de progresso e o checklist detalhado em `docs/plano-ifastfood.md`.
   - Registrar no README.md se houver mudança de status de fase.
   - Criar ADR em `docs/adr/` para qualquer decisão arquitetural relevante (gateways, modelos de dados, contratos, codegen).
3. **Padrões Técnicos Inegociáveis:**
   - Dinheiro sempre em centavos inteiros (`MoneyCents`), taxas em basis points (`bps`).
   - Regras de negócio puras em `packages/domain` com cobertura de testes unitários ≥ 85%.
   - Contratos Zod compartilhados em `packages/contracts` gerando schemas OpenAPI para os clientes nativos (Kotlin/Swift).
   - Gateway de pagamento padrão: **Stripe** (com arquitetura aberta para Mercado Pago como secundário).
   - Aplicativos nativos mantidos para Cliente, Parceiro e Entregador (Kotlin / Swift).
   - MVP lançado após a **Fase F5** (Financeiro + Backoffice).
4. **Verificação Pré-Commit:**
   - Executar os testes unitários da fase em questão.
   - Garantir 0 erros de compilação/testes antes de comitar e fazer push para o remoto.
