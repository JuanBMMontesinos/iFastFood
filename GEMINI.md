# iFastFood — Diretrizes do Agente & Planejamento Contínuo

Este projeto possui planejamento arquitetural e de fases versionado diretamente no repositório.

## Fonte da Verdade do Planejamento
- Plano mestre: `docs/plano-ifastfood.md`
- ADRs: `docs/adr/`
- Skill de planejamento: `.agents/skills/project-planning/SKILL.md`

## Diretrizes de Execução
1. **Preservação de Contexto:** Sempre atualize `docs/plano-ifastfood.md` ao implementar ou concluir tarefas de qualquer fase (F0 até F7). Nunca deixe o planejamento se perder.
2. **Decisões do Usuário:**
   - Apps nativos mantidos (Kotlin e Swift) via OpenAPI codegen.
   - Lançamento do MVP após a fase **F5** (inclui Despacho + Entregador + Financeiro + Backoffice).
   - Gateway de pagamento padrão: **Stripe** (com suporte multi-gateway).
   - Migrations do banco de dados são aplicadas diretamente no Supabase pela IA.
3. **Qualidade & Git:**
   - Para cada fase concluída: rodar os testes unitários até 0 erros.
   - Realizar commit descritivo e push para o remoto do GitHub.
4. **Convenções de Domínio:**
   - Valores monetários em centavos inteiros (`MoneyCents`). Taxas em basis points (`bps`).
   - Regras de negócio em `packages/domain` com testes (Vitest ≥ 85% cobertura).
