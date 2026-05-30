ARG WORKSPACE_NAME
ARG WORKSPACE_DIR
ARG VITE_API_URL=https://example.com

FROM node:20-alpine AS build
ARG WORKSPACE_NAME
ARG WORKSPACE_DIR
ARG VITE_API_URL
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY packages ./packages
COPY zamio_frontend ./zamio_frontend
COPY zamio_admin ./zamio_admin
COPY zamio_stations ./zamio_stations
COPY zamio_publisher ./zamio_publisher
RUN npm install --workspaces --include-workspace-root \
 && ARCH="$(uname -m)" \
 && case "$ARCH" in \
      x86_64) PKG="@rollup/rollup-linux-x64-musl" ;; \
      aarch64) PKG="@rollup/rollup-linux-arm64-musl" ;; \
      armv7l) PKG="@rollup/rollup-linux-arm-musleabihf" ;; \
      *) PKG="" ;; \
    esac \
 && if [ -n "$PKG" ]; then npm install --ignore-scripts --no-save "$PKG"; fi
ENV VITE_API_URL=${VITE_API_URL}
RUN set -eux; \
    WORKSPACE_NAME_LOCAL="${WORKSPACE_NAME-}"; \
    WORKSPACE_DIR_LOCAL="${WORKSPACE_DIR-}"; \
    WORKSPACE="${WORKSPACE_NAME_LOCAL:-${WORKSPACE_DIR_LOCAL}}"; \
    if [ -z "${WORKSPACE}" ]; then \
      echo "WORKSPACE_NAME or WORKSPACE_DIR build arg must be provided" >&2; \
      exit 1; \
    fi; \
    npm run build --workspace "${WORKSPACE}"

FROM nginx:1.27-alpine
ARG WORKSPACE_DIR
COPY --from=build /workspace/${WORKSPACE_DIR}/dist /usr/share/nginx/html
COPY docker/nginx/spa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
