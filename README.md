# MNVD (Monitor-NVD)

A Node.js application that monitors the National Vulnerability Database (NVD) for specific operating systems and services, sending notifications to Discord when new vulnerabilities are detected.

> **NVD Attribution Notice:** This product uses the NVD API but is not endorsed or certified by the NVD.

## Features

- 🛡️ **Automated Vulnerability Monitoring**: Regularly scans NVD for vulnerabilities matching your CPE queries
- 📢 **Centralized Discord Notifications**: All notifications sent to a single configured Discord webhook
- 🌐 **Web Interface**: Simple web frontend for managing vulnerability queries
- 🔄 **Idempotency**: Avoids sending duplicate notifications for the same vulnerability
- 🐳 **Docker Support**: Easy deployment with Docker and Docker Compose
- 📊 **Statistics Dashboard**: View processed vulnerabilities and query statistics
- 🎯 **Simplified Architecture**: One webhook per Docker container for predictable deployment

## Prerequisites

- Node.js 18+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- NVD API Key (get one from [NVD Developers](https://nvd.nist.gov/developers/request-an-api-key))
- Discord Webhook URL

## Quick Start with Docker

1. **Clone the repository and navigate to the project directory**
   ```bash
   cd /path/to/nvd-scanner
   ```

2. **Create environment file**
   ```bash
   cp env.example .env
   ```

3. **Edit `.env` with your API keys**
   ```env
   NVD_API_KEY=your_nvd_api_key_here
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token
   ```

4. **Build and run with Docker Compose**
   ```bash
   docker compose -f docker-compose.yml up --build
   ```

5. **Access the web interface**
   Open http://localhost:3000 in your browser

## Production Deployment

For production deployment using pre-built images from GHCR:

1. **Set up environment variables**
   ```bash
   # Copy the environment template
   cp env_template .env
   
   # Edit .env with your configuration
   nano .env
   ```

2. **Configure user permissions (for rootless Docker)**
   ```bash
   # Set your user ID and group ID in .env
   echo "USER_ID=$(id -u)" >> .env
   echo "GROUP_ID=$(id -g)" >> .env
   ```

3. **Start production environment**
   ```bash
   docker compose -f docker-compose.production.yml up -d
   ```

4. **Access the application**
   - Frontend: http://localhost
   - Backend API: http://localhost/api

## Manual Installation

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your API keys
   ```

3. **Build the frontend**
   ```bash
   npm run build:frontend
   ```

4. **Start the application**
   ```bash
   npm start
   ```

## Usage

### Adding Vulnerability Queries

1. Open the web interface at http://localhost:3000
2. Click "Add Query"
3. Fill in the required fields:
   - **CPE ID**: The Common Platform Enumeration identifier (e.g., `cpe:2.3:o:microsoft:windows_10:*:*:*:*:*:*:*`)
   - **Name**: Optional friendly name for the query
   - **Description**: Optional description

**Note**: All notifications will be sent to the Discord webhook configured in your `.env` file.

### Finding CPE Identifiers

You can find CPE identifiers using:
- [NVD CPE Search](https://nvd.nist.gov/products/cpe/search)
- [CPE Dictionary](https://nvd.nist.gov/products/cpe)

### Multi-Channel Setup

If you need notifications sent to multiple Discord channels:
- Deploy separate Docker containers for each channel
- Configure each container with its own `.env` file containing the appropriate webhook URL
- Each container can monitor different sets of CPE queries

### Manual Scanning

- Click the "Run Scan" button in the web interface to manually trigger a scan
- The application automatically scans every 6 hours for new vulnerabilities

## API Endpoints

### Queries Management
- `GET /api/queries` - List all queries
- `POST /api/queries` - Create a new query
- `DELETE /api/queries/:id` - Delete a query

### Scanning
- `POST /api/scan` - Trigger manual scan

### Statistics
- `GET /api/stats` - Get scan statistics
- `GET /api/health` - Health check

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NVD_API_KEY` | Your NVD API key | Yes |
| `DISCORD_WEBHOOK_URL` | Default Discord webhook URL | No (can be set per query) |
| `PORT` | Server port (default: 3000) | No |
| `DB_PATH` | SQLite database path | No |

## Security Best Practices

- Store API keys securely using environment variables
- Use HTTPS in production
- Regularly rotate API keys
- Monitor application logs for security issues
- Keep dependencies updated

## Troubleshooting

### Common Issues

1. **Rate Limiting**: The NVD API has rate limits. The application handles this automatically with retries.

2. **Invalid CPE Format**: Ensure your CPE identifiers follow the correct format: `cpe:2.3:part:vendor:product:version:update:edition:language`

3. **Discord Notifications Not Working**: Verify your webhook URL is correct and the webhook hasn't expired.

### Logs

Check the application logs for detailed error information:
```bash
docker-compose logs nvd-scanner
```

## Development

### Project Structure

```
nvd-scanner/
├── backend/                 # Node.js backend
│   ├── server.js           # Main server file
│   ├── database.js         # SQLite database operations
│   ├── nvd-client.js       # NVD API client
│   ├── discord-notifier.js # Discord notification handler
│   └── scanner.js          # Scanning orchestration
├── frontend/               # React frontend
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   └── index.js       # React entry point
│   └── public/
├── docker/                 # Docker configuration
│   └── Dockerfile
├── docker-compose.yml      # Docker Compose setup
└── README.md
```

### Adding New Features

1. Backend features go in the `backend/` directory
2. Frontend components go in `frontend/src/components/`
3. Update the Dockerfile if you add new dependencies
4. Test with Docker Compose before deploying

## License

MIT License - see LICENSE file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with Docker Compose
5. Submit a pull request

## Support

For issues and questions:
- Create an issue on GitHub
- Check the NVD API documentation: https://nvd.nist.gov/developers
- Discord webhook documentation: https://discord.com/developers/docs/resources/webhook
