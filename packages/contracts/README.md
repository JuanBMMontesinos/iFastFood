# Contratos do iFastFood (`@ifastfood/contracts`)

Contrato único compartilhado por todas as superfícies:
- Apps **React/Next** (cliente web, admin, parceiro) usam os schemas Zod diretamente.
- Apps **nativos** recebem SDKs gerados do OpenAPI da API NestJS
  (openapi-generator → Kotlin/Swift), mantendo os mesmos nomes/validações.

## Geração dos SDKs nativos (Durante F3/F4)

Pré-requisito: Java 11+ (openapi-generator-cli).

```bash
# Kotlin (Android)
npx @openapi-generator-cli/cli generate -c generators/kotlin-client.yaml

# Swift (iOS)
npx @openapi-generator-cli/cli generate -c generators/swift-client.yaml
```

O `openapi.json` de entrada é gerado pela própria API NestJS
(endpoint `/docs-json`) e copiado para `generators/openapi/`.
