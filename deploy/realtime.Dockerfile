# Pinpoint Party Rooms server (Socket.IO). Build context: the repository root.
FROM node:22-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY apps/realtime/package.json apps/realtime/
COPY packages/game/package.json packages/game/
COPY packages/ui/package.json packages/ui/
COPY packages/data/package.json packages/data/
RUN npm ci

FROM deps AS build
COPY . .
# the server reads the same generated country data and flags as the web app
RUN npm run data

FROM base AS run
ENV NODE_ENV=production PORT=4000
RUN addgroup -S app && adduser -S app -G app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/packages/game ./packages/game
COPY --from=build --chown=app:app /app/apps/realtime ./apps/realtime
COPY --from=build --chown=app:app /app/apps/web/public ./apps/web/public
USER app
WORKDIR /app/apps/realtime
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://127.0.0.1:4000/health >/dev/null || exit 1
CMD ["node_modules/.bin/tsx", "src/server.ts"]
