# RIA Talent Portal - Multi-Stage Dockerfile
# Matches simplevisor.ai deployment pattern

# ============================================================================
# Stage 1: Base dependencies
# ============================================================================
FROM node:20-slim AS base

# Install common dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --legacy-peer-deps

# ============================================================================
# Stage 2: Development
# ============================================================================
FROM base AS development
WORKDIR /app

# Copy source code
COPY . .

# Set development environment
ENV NODE_ENV=development
ENV PORT=3000

EXPOSE 3000

# Health check for development
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Development runs Vite dev server
CMD ["npm", "run", "dev"]

# ============================================================================
# Stage 3: Builder
# ============================================================================
FROM base AS builder
WORKDIR /app

# Copy source code
COPY . .

# Set production environment for build
ENV NODE_ENV=production

# Build the React application
RUN npm run build

# ============================================================================
# Stage 4: Staging
# ============================================================================
FROM base AS staging
WORKDIR /app

# Copy built assets and source
COPY --from=builder /app .

# Set staging environment
ENV NODE_ENV=staging
ENV PORT=8080

# Copy and setup entrypoint script
COPY scripts/docker-entrypoint.sh ./scripts/
RUN chmod +x ./scripts/docker-entrypoint.sh

EXPOSE 8080

# Health check for staging
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

CMD ["/bin/sh", "./scripts/docker-entrypoint.sh"]

# ============================================================================
# Stage 5: Production
# ============================================================================
FROM node:20-slim AS production

# Install minimal runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
    curl \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# Copy package files and install production dependencies only
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production --legacy-peer-deps

# Copy built assets
COPY --from=builder /app/dist ./dist

# Copy server and scripts
COPY --from=builder /app/server.js ./
COPY --from=builder /app/scripts ./scripts

# Set correct permissions
RUN chown -R appuser:nodejs /app && \
    chmod +x ./scripts/docker-entrypoint.sh

# Switch to non-root user
USER appuser

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Health check for production
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

# Production startup with entrypoint
ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
