FROM node:22.12.0-bookworm-slim

# Set environment
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV NODE_OPTIONS="--no-warnings --max_old_space_size=1024"

WORKDIR /app

# Install system dependencies for Playwright
# We use playwright install-deps for better compatibility
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && npx playwright install-deps chromium firefox webkit \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /ms-playwright \
    && chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app \
    && chown -R pptruser:pptruser /ms-playwright

# Copy package files
COPY --chown=pptruser:pptruser package.json package-lock.json* ./
COPY --chown=pptruser:pptruser tsconfig.json ./

# Switch to non-root user
USER pptruser

# Install dependencies
RUN npm ci --include=dev

# Install Playwright browsers (as user)
# We specificy the browsers we need - NO --with-deps here as we don't have root
RUN npx playwright install chromium firefox webkit

# Copy source code
COPY --chown=pptruser:pptruser src ./src

# Build
RUN npm run build

# Prune dev dependencies for smaller image
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start
CMD ["node", "dist/index.js"]
