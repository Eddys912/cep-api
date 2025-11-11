FROM node:22.12.0-bookworm

WORKDIR /app

# Copy config files
COPY package.json pnpm-lock.yaml* ./
COPY tsconfig.json ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
  libnss3 \
  libatk-bridge2.0-0 \
  libdrm2 \
  libxkbcommon0 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  libgbm1 \
  libxss1 \
  libasound2 \
  && rm -rf /var/lib/apt/lists/*

# Install Playwright browsers
RUN pnpm exec playwright install --with-deps webkit chromium firefox

# Copy the source code
COPY . .

# Compiler TypeScript to JavaScript
RUN pnpm run build

# Expose port
EXPOSE 3000

# Disable Node.js stdout/stderr buffering for Docker logs
ENV NODE_OPTIONS="--no-warnings --max_old_space_size=512"

# Use the script to start the server
CMD [ "node", "--unhandled-rejections=strict", "dist/index.js" ]
