# Frontend Dockerfile for NVD Scanner
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies needed for build)
RUN npm install

# Copy source code
COPY . .

# Build the React app
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production

# Create app user for security
RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G appuser -g appuser appuser

# Copy built React app to nginx
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration for React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create nginx directories and set permissions
RUN mkdir -p /var/cache/nginx /var/log/nginx /var/run && \
    chown -R appuser:appuser /var/cache/nginx /var/log/nginx /var/run /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Update nginx config to run as non-root user
RUN sed -i 's/user nginx;/user appuser;/' /etc/nginx/nginx.conf && \
    sed -i 's/pid \/var\/run\/nginx.pid;/pid \/var\/run\/nginx.pid;/' /etc/nginx/nginx.conf

# Switch to non-root user
USER appuser

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
