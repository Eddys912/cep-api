FROM mcr.microsoft.com/playwright:v1.56.0-noble

# Set environment
ENV NODE_OPTIONS="--no-warnings --max_old_space_size=1024"

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY tsconfig.json ./

# Install dependencies
# We don't set NODE_ENV=production yet so devDependencies (like typescript) are installed
RUN npm ci

# Copy source code
COPY src ./src

# Build
RUN npm run build

# Set environment to production and prune dev dependencies
ENV NODE_ENV=production
RUN npm prune --production

# Expose port
EXPOSE 3000

# Start
RUN chown -R pwuser:pwuser /app
USER pwuser

# Comando de inicio
CMD ["node", "dist/index.js"]
