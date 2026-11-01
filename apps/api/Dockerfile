# iFastFood API — imagem de produção (build monorepo pnpm + Turbo)
FROM node:22-alpine AS base
WORKDIR /repo
RUN corepack enable && corepack prepare pnpm@12.8.1 --activate

FROM base AS build
COPY . /repo
RUN pnpm install --frozen-lockfile
RUN pnpm exec turbo run build --filter=@ifastfood/api

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/apps/api/dist ./apps/api/dist
COPY --from=build /repo/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /repo/apps/api/prisma ./apps/api/prisma
COPY --from=build /repo/apps/api/package.json ./apps/api/package.json
COPY --from=build /repo/packages ./packages
WORKDIR /repo/apps/api
EXPOSE 3001
CMD ["node", "dist/main.js"]
