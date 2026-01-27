FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Set environment
ENV NODE_OPTIONS="--no-warnings --max_old_space_size=1024"

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build
RUN npm run build

# Set environment to production and prune dev dependencies
ENV NODE_ENV=production
RUN npm prune --production

# Start
RUN chown -R pwuser:pwuser /app
USER pwuser

# Expose port
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/index.js"]
