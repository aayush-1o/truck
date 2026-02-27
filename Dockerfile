# ============================================================
# Stage 1: deps — install production dependencies only
# Using a separate stage keeps the final image free of build tools
# ============================================================
FROM node:20-alpine AS deps

WORKDIR /app

# Copy only package files first — Docker layer cache will skip
# npm ci when these haven't changed (e.g. only source changed)
COPY package*.json ./

# npm ci for reproducible installs; --only=production skips
# jest, supertest, nodemon — not needed at runtime
RUN npm ci --only=production

# ============================================================
# Stage 2: runner — the actual production image
# Non-root user, minimal surface area
# ============================================================
FROM node:20-alpine AS runner

WORKDIR /app

# Create a system-level non-root user+group
# Running as root inside containers is a security anti-pattern
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 freightflow

# Copy node_modules from the deps stage — avoids re-running npm ci
COPY --from=deps /app/node_modules ./node_modules

# Copy application source with correct ownership
# --chown applies at copy time, cheaper than a separate chown RUN
COPY --chown=freightflow:nodejs . .

# Remove files that must never exist inside a production image
# .env would expose secrets; seed.js gives DB write access to anyone with shell
RUN rm -f .env .env.example seed.js test-connection.js && \
    rm -rf test/

# Switch to non-root before the EXPOSE/CMD instructions
USER freightflow

# Document the port (doesn't actually publish — done at docker run time)
EXPOSE 5000

ENV NODE_ENV=production

# Healthcheck used by Docker and Railway to decide if the container is healthy
# Hits the /api/health endpoint we added to server.js
# --start-period gives Node time to connect to MongoDB before checks begin
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "server.js"]
