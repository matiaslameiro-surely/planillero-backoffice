# syntax=docker/dockerfile:1

# ---- Etapa de build: Node (versión que exige `engines` del package.json y .nvmrc) ----
FROM node:24-alpine AS build
WORKDIR /app

# Dependencias primero: esta capa se reusa mientras no cambien package.json / package-lock.json.
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci

COPY . .
# Configuración `docker`: el bundle llama a la API en el mismo origen (NGINX la proxya al backend).
RUN npx ng build --configuration docker

# ---- Etapa de ejecución: NGINX sin privilegios (escucha en 8080, usuario `nginx`) ----
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/errors /usr/share/nginx/errors
COPY --from=build /app/dist/planillero-backoffice/browser /usr/share/nginx/html

EXPOSE 8080
