# Backend Dockerfile for NVD Scanner
FROM node:25-slim AS base

WORKDIR /app

# Set ownership of workdir to node user
RUN chown node:node /app

# Switch to node user before any file operations
USER node

# Copy package files
COPY --chown=node:node package*.json ./

# Install dependencies (production only)
RUN npm ci --omit=dev

# Verify critical dependencies are installed
RUN node -e "require('dotenv'); require('express'); require('axios'); require('cors'); require('helmet'); console.log('All critical dependencies found')"

# Copy backend source code
COPY --chown=node:node . .

# Create data directory as node user
RUN mkdir -p /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application (database initialization is handled by server.js)
CMD ["node", "server.js"]
