# Next.js app — built for Azure Container Apps (az acr build)
FROM node:22-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# NEXT_PUBLIC_* vars are inlined at build time — pass via az acr build --build-arg
ARG NEXT_PUBLIC_TENANT_ID
ARG NEXT_PUBLIC_AUTH_ENABLED
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_TENANT_ID=$NEXT_PUBLIC_TENANT_ID \
    NEXT_PUBLIC_AUTH_ENABLED=$NEXT_PUBLIC_AUTH_ENABLED \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
RUN pnpm build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
