# =============================================================
# STAGE 1: Builder — Compila el TypeScript
# =============================================================
FROM node:22-slim AS builder

WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar archivos de dependencias y configuración TS
COPY package.json pnpm-lock.yaml* tsconfig.json tsoa.json ./

# Instalar TODAS las deps (incluyendo devDependencies para tsc)
RUN pnpm install --frozen-lockfile

# Copiar código fuente TypeScript
COPY src ./src

# Compilar TypeScript → genera /app/dist/
RUN pnpm run build

# =============================================================
# STAGE 2: Production — Imagen final limpia con Playwright
# =============================================================
# La imagen oficial de Playwright ya incluye:
# - Chromium, Firefox, WebKit
# - Todas las dependencias de SO necesarias (libxss, libglib, etc.)
FROM mcr.microsoft.com/playwright:v1.40.0-focal

ENV NODE_OPTIONS="--no-warnings --max_old_space_size=1024"
ENV NODE_ENV=production

WORKDIR /app

# Instalar pnpm en la imagen de producción
RUN npm install -g pnpm

# Copiar solo lo necesario desde el builder
COPY package.json pnpm-lock.yaml* ./

# Copiar el código TypeScript ya compilado
COPY --from=builder /app/dist ./dist

# Instalar SOLO dependencias de producción (sin devDependencies)
RUN pnpm install --prod --frozen-lockfile

# El usuario pwuser ya existe en la imagen de Playwright
RUN chown -R pwuser:pwuser /app
USER pwuser

EXPOSE 3000

# Iniciar el servidor compilado desde TypeScript
CMD ["node", "dist/server.js"]
