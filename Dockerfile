# syntax=docker/dockerfile:1

# 1. Interface : build Vite (image Debian, car TypeScript 7 n'a pas de binaire musl).
FROM node:24-trixie-slim AS interface
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# 2. PocketBase, qui sert l'API, l'administration et l'interface construite.
FROM alpine:3.24
ARG PB_VERSION=0.40.6
ARG TARGETARCH
RUN set -eux; \
    apk add --no-cache ca-certificates wget; \
    case "${TARGETARCH}" in \
      amd64) sha=0e1f609158ed945f809f8a02ae012aa0427129c66ebb63c1aee76f2c0309373f ;; \
      arm64) sha=d22c66ceb67ca92b7d767f36d826e848a276bcfa3c197ead20bf87c42208984f ;; \
      *) echo "Architecture non prise en charge : ${TARGETARCH}"; exit 1 ;; \
    esac; \
    wget -q -O /tmp/pb.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip"; \
    echo "${sha}  /tmp/pb.zip" | sha256sum -c -; \
    unzip -q /tmp/pb.zip pocketbase -d /pb; \
    rm /tmp/pb.zip; \
    adduser -D -H -u 10001 pocketbase; \
    mkdir -p /pb/pb_data; \
    chown pocketbase:pocketbase /pb/pb_data

COPY pocketbase/pb_migrations /pb/pb_migrations
COPY pocketbase/pb_hooks /pb/pb_hooks
COPY --from=interface /web/dist /pb/pb_public

USER pocketbase
WORKDIR /pb
EXPOSE 8090
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://127.0.0.1:8090/api/health || exit 1

CMD ["/pb/pocketbase", "serve", \
     "--http=0.0.0.0:8090", \
     "--dir=/pb/pb_data", \
     "--migrationsDir=/pb/pb_migrations", \
     "--hooksDir=/pb/pb_hooks", \
     "--publicDir=/pb/pb_public", \
     "--hooksWatch=false"]
