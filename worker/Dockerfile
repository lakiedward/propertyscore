FROM eclipse-temurin:21.0.12_8-jre-noble AS java

FROM node:24-bookworm-slim

COPY --from=java /opt/java/openjdk /opt/java/openjdk
ENV JAVA_HOME=/opt/java/openjdk \
  PATH=/opt/transit/bin:/opt/java/openjdk/bin:$PATH \
  XDG_CACHE_HOME=/opt/cache

RUN apt-get update \
  && apt-get install --yes --no-install-recommends ca-certificates osmium-tool unzip python3 python3-venv gdal-bin \
  && rm -rf /var/lib/apt/lists/* \
  && npm install --global pnpm@12.10.1

COPY worker/transit/requirements.txt /tmp/transit-requirements.txt
RUN python3 -m venv /opt/transit \
  && /opt/transit/bin/pip install --no-cache-dir --requirement /tmp/transit-requirements.txt \
  && /opt/transit/bin/python -c "import r5py.r5" \
  && chown -R node:node /opt/cache

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY worker/package.json worker/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter @propertyscore/worker

COPY worker/src worker/src
COPY worker/transit worker/transit

WORKDIR /app/worker
ENV NODE_ENV=production
USER node
CMD ["node", "src/main.ts", "build-snapshot"]
