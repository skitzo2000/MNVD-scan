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

# Production stage with serve
FROM node:18-alpine AS production

# Install serve globally
RUN npm install -g serve

WORKDIR /app

# Copy built React app
COPY --from=builder /app/build .

# Expose port 80
EXPOSE 80

# Start serve
CMD ["serve", "-s", ".", "-l", "80"]
