# Backend Dockerfile for NVD Scanner
FROM node:18-slim AS base

# Install dependencies for native modules and SQLite
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --only=production && npm cache clean --force

# Copy backend source code
COPY . .

# Create data directory for SQLite database
RUN mkdir -p /app/data && \
    chmod -R 755 /app

# User mapping is handled by docker-compose at runtime
# This allows the container to work with any UID/GID passed at runtime

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application
CMD ["node", "server.js"]