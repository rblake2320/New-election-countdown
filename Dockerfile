# Multi-stage build for optimized production image
# Stage 1: Build the application
FROM node:24-alpine AS builder
ENV PUPPETEER_SKIP_DOWNLOAD=true

# Set working directory
WORKDIR /app

# Install all dependencies (build requires devDependencies: vite, esbuild)
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production image
FROM node:24-alpine AS production
ENV PUPPETEER_SKIP_DOWNLOAD=true

# The deployed backup service requires the same major-version client as PostgreSQL.
RUN apk add --no-cache dumb-init postgresql16-client

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Schema changes run as a separate reviewed release operation, never at web boot.
RUN npm ci --omit=dev && \
    npm cache clean --force

# Runtime contains only compiled application files.
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
# Offline source proofs and the separately operated C6 migration/CLI.
COPY --from=builder --chown=nodejs:nodejs /app/data/official-results ./data/official-results
COPY --from=builder --chown=nodejs:nodejs /app/migrations/20261011_official_results_routes.sql ./migrations/20261011_official_results_routes.sql

# Services create retention/log directories at boot while running as nodejs.
RUN mkdir -p /app/artifacts /app/backups /app/logs /app/infrastructure && \
    chown nodejs:nodejs /app/artifacts /app/backups /app/logs /app/infrastructure

# Switch to non-root user
USER nodejs

# Production environment
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]
