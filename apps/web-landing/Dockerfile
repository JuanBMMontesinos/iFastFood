FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@12.8.1

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages ./packages
COPY apps/web-landing ./apps/web-landing
RUN pnpm install
RUN pnpm --filter @ifastfood/contracts build
RUN pnpm --filter @ifastfood/ui-tokens build
RUN pnpm --filter @ifastfood/web-landing build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app ./

EXPOSE 3000
CMD ["pnpm", "--filter", "@ifastfood/web-landing", "start"]
