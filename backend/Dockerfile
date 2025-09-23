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

# Create data directory and set proper permissions
# Don't set ownership here - let docker-compose handle user mapping
RUN mkdir -p /app/data && \
    chmod -R 775 /app/data

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1))"

# Start the application (database initialization is handled by server.js)
CMD ["node", "server.js"]