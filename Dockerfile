FROM mcr.microsoft.com/playwright:v1.56.0-noble

# Set environment
ENV NODE_ENV=production
ENV NODE_OPTIONS="--no-warnings --max_old_space_size=1024"

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build
RUN npm run build

# Prune dev dependencies for smaller image
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start
RUN chown -R pwuser:pwuser /app
USER pwuser

# Comando de inicio
CMD ["node", "dist/index.js"]
