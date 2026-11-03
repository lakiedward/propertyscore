FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates osmium-tool unzip \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@12.10.1

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY worker/package.json worker/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @propertyscore/worker

COPY worker/src worker/src

WORKDIR /app/worker
ENV NODE_ENV=production
USER node
CMD ["node", "src/main.ts", "build-snapshot"]
