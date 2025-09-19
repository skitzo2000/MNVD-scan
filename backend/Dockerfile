# Backend Dockerfile for NVD Scanner
FROM node:22-slim AS base

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Verify critical dependencies are installed
RUN node -e "require('dotenv'); require('express'); require('axios'); require('cors'); require('helmet'); console.log('All critical dependencies found')"

# Copy backend source code
COPY . .

# Create data directory for JSON file storage and ensure node user owns it
RUN mkdir -p /app/data && \
    chown -R node:node /app && \
    chmod -R 755 /app

# User mapping is handled by docker-compose at runtime
# The entire /app directory is owned by node user for proper permissions

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application (database initialization is handled by server.js)
CMD ["node", "server.js"]