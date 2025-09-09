#!/bin/bash

# Start MNVD Docker container with current user's UID and GID
export USER_ID=$(id -u)
export GROUP_ID=$(id -g)

echo "Starting MNVD with UID: $USER_ID, GID: $GROUP_ID"

# Stop and remove existing container if it exists
docker compose down 2>/dev/null || true

# Start the container
docker compose up -d

echo "MNVD is starting up..."
echo "Check status with: docker compose logs -f"
echo "Access the web interface at: http://localhost:3000"
