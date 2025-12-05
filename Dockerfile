FROM node:22.12.0-bookworm

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Install system dependencies for ALL Playwright browsers
RUN apt-get update && apt-get install -y \
  # Dependencias comunes
  libnss3 \
  libnspr4 \
  libdbus-1-3 \
  libatk1.0-0 \
  libatk-bridge2.0-0 \
  libcups2 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxfixes3 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2 \
  libatspi2.0-0 \
  libx11-6 \
  libxcb1 \
  libx11-xcb1 \
  libxcursor1 \
  libxi6 \
  libxrender1 \
  libxtst6 \
  libglib2.0-0 \
  libpango-1.0-0 \
  libcairo2 \
  # Para WebKit específicamente
  libwoff1 \
  libopus0 \
  libwebpdemux2 \
  libwebp7 \
  libenchant-2-2 \
  libsecret-1-0 \
  libhyphen0 \
  libgdk-pixbuf2.0-0 \
  libegl1 \
  libnotify4 \
  libxslt1.1 \
  libevdev2 \
  libgles2 \
  # Certificados SSL
  ca-certificates \
  # Fuentes
  fonts-liberation \
  fonts-noto-color-emoji \
  && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers
RUN npx playwright install chromium firefox webkit

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Remove devDependencies and clean up
RUN npm prune --production && \
    npm cache clean --force && \
    rm -rf /root/.npm

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-warnings --max_old_space_size=512"

# Start server
CMD ["node", "--unhandled-rejections=strict", "dist/index.js"]
