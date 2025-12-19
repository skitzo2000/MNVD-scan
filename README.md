# MNVD (Monitor-NVD)

A Node.js application that monitors the National Vulnerability Database (NVD) for specific operating systems and services, sending notifications to Discord when new vulnerabilities are detected.

> **NVD Attribution Notice:** This product uses the NVD API but is not endorsed or certified by the NVD.

## Features

- 🛡️ **Automated Vulnerability Monitoring**: Regularly scans NVD for vulnerabilities matching your CPE queries
- 📢 **Multi-Platform Notifications**: Supports Discord and Microsoft Teams webhooks
- 🌐 **Web Interface**: Modern Next.js frontend for managing vulnerability queries
- 🔄 **Idempotency**: Avoids sending duplicate notifications for the same vulnerability
- 🐳 **Docker Support**: Easy deployment with Docker and Docker Compose
- 📊 **Statistics Dashboard**: View processed vulnerabilities and query statistics
- 🎯 **Simplified Architecture**: One webhook per Docker container for predictable deployment
- 💾 **JSON File Storage**: Lightweight, portable data storage with no database dependencies
- 🧪 **Comprehensive Testing**: Full test suite for API and frontend integration

## Roadmap / Wishlist

- 🏷️ **Query Categories**: Organize queries into categories (e.g., "Critical Systems", "Development", "Production") with category-specific webhooks
- 📱 **Mobile App**: Native mobile application for monitoring vulnerabilities on the go
- 🔔 **Advanced Notifications**: Email notifications, SMS alerts, and custom notification channels
- 📈 **Analytics Dashboard**: Advanced reporting and trend analysis for vulnerability data
- 🔍 **Smart Filtering**: AI-powered vulnerability filtering and prioritization
- 🌍 **Multi-Region Support**: Deploy across multiple regions for high availability

## Prerequisites

- Node.js 22+ (for local development)
- Docker and Docker Compose (for containerized deployment)
- NVD API Key (get one from [NVD Developers](https://nvd.nist.gov/developers/request-an-api-key))
- Discord Webhook URL

## Quick Start with Docker (Development)

1. **Clone the repository and navigate to the project directory**
   ```bash
   cd /path/to/mnvd-scanner
   ```

2. **Create environment file**
   ```bash
   cp env_template .env
   ```

3. **Edit `.env` with your API keys**
   ```env
   NVD_API_KEY=your_nvd_api_key_here
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_id/your_webhook_token
   TEAMS_WEBHOOK_URL=https://your-org.webhook.office.com/webhookb2/your_webhook_id/IncomingWebhook/your_webhook_token
   ```

4. **Build and run with Docker Compose (Development)**
   ```bash
   docker compose up --build
   ```

5. **Access the web interface**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

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
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Manual Installation

1. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend && npm install && cd ..
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Or use the convenience script
   npm run install:all
   ```

2. **Set up environment variables**
   ```bash
   cp env_template .env
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
| `DISCORD_WEBHOOK_URL` | Discord webhook URL | No (can be set per query) |
| `TEAMS_WEBHOOK_URL` | Microsoft Teams webhook URL | No (can be set per query) |
| `PORT` | Server port (default: 3000) | No |
| `DATA_DIR` | JSON file storage directory (default: ./data) | No |

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
docker-compose logs mnvd-scanner
```

## Development

### Project Structure

```
mnvd-scanner/
├── backend/                 # Node.js backend
│   ├── server.js           # Main server file
│   ├── database.js         # Database operations (DAL interface)
│   ├── dal/                # Data Access Layer
│   │   └── index.js        # JSON file storage implementation
│   ├── nal/                # Notification Access Layer
│   │   └── index.js        # Webhook management implementation
│   ├── sal/                # Scan Access Layer
│   │   └── index.js        # Scan and workflow management
│   ├── notification-service.js # Multi-platform notification service
│   ├── nvd-client.js       # NVD API client
│   ├── discord-notifier.js # Legacy Discord notification handler
│   └── scanner.js         # Scanning orchestration
├── frontend/               # Next.js frontend
│   ├── components/         # React components
│   ├── pages/             # Next.js pages and API routes
│   ├── lib/               # Utility libraries
│   └── src/               # Main App component
├── data/                   # JSON file storage
│   ├── queries.json       # Vulnerability queries
│   ├── cves.json          # CVE data
│   ├── scans.json         # Scan history and statistics
│   ├── workflows.json     # Workflow definitions and templates
│   ├── notifications.json # Notification history
│   └── webhooks.json      # Webhook configuration
├── tests/                  # Test suites
│   ├── test-api.sh        # API endpoint tests
│   ├── test-frontend.sh   # Frontend integration tests
│   ├── test-nal.js        # NAL functionality tests
│   ├── test-sal.js        # SAL functionality tests
│   ├── test-webhooks.js   # Webhook compatibility tests
│   └── run-all-tests.sh   # Complete test suite
├── docker-compose.yml      # Docker Compose setup
└── README.md
```

## Architecture

### Data Access Layer (DAL)
The application uses a modern Data Access Layer pattern with JSON file storage:
- **No Database Dependencies**: Uses lightweight JSON files for data persistence
- **Portable Storage**: Easy to backup, migrate, and version control
- **Fast Performance**: Direct file I/O with no database overhead
- **Simple Maintenance**: No database administration or migration scripts needed

### Notification Access Layer (NAL)
The application includes a comprehensive Notification Access Layer for managing webhooks:
- **Multi-Platform Support**: Discord and Microsoft Teams webhook integration
- **Category Management**: Organize webhooks by categories (Critical Systems, Development, Production)
- **Flexible Routing**: Send notifications to specific webhooks or entire categories
- **Comprehensive Logging**: Track notification success/failure rates and statistics
- **Platform Detection**: Automatic detection of webhook types (Discord vs Teams)

### Scan Access Layer (SAL)
The application features an advanced Scan Access Layer for managing vulnerability scans:
- **Multiple Scan Types**: NVD scans, custom scans, and workflow-based scans
- **Workflow Management**: Create complex multi-step security assessment workflows
- **Template System**: Pre-built workflow templates for common security tasks
- **Custom Scan Types**: Version checks, configuration audits, dependency scanning
- **Scheduling Support**: Schedule scans for automated execution
- **Advanced Workflows**: Multi-step processes combining different scan types
- 
### Key Components
- **Backend**: Node.js 22 with Express.js API
- **Frontend**: Next.js 15 with React 19 and Material-UI 7
- **Storage**: JSON file-based Data Access Layer
- **Notifications**: Multi-platform webhook management with NAL
- **Testing**: Comprehensive test suite with API and integration tests
- **Containerization**: Docker with multi-stage builds and rootless support

### Adding New Features

1. Backend features go in the `backend/` directory
2. Frontend components go in `frontend/components/`
3. Data operations go through the DAL in `backend/dal/`
4. Update the Dockerfile if you add new dependencies
5. Test with Docker Compose before deploying
6. Run the test suite to ensure compatibility

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
