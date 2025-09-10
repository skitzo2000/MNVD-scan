require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
// const cron = require('node-cron'); // Temporarily disabled for debugging

// Import our modules
const { initializeDatabase, getAllQueries, createQuery, deleteQuery, getScanStats, getRecentNotifications, getQueryCVEStats, getCVEsForQuery } = require('./database');
const nvdClient = require('./nvd-client');
const discordNotifier = require('./discord-notifier');
const scanner = require('./scanner');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files are served by nginx in production
// app.use(express.static(path.join(__dirname, '../frontend/build')));

// API Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

// Query management routes
app.get('/api/queries', async (req, res) => {
  try {
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const queries = await getAllQueries(dbInstance);
    res.json(queries);
  } catch (error) {
    console.error('Error fetching queries:', error);
    res.status(500).json({ error: 'Failed to fetch queries' });
  }
});

app.post('/api/queries', async (req, res) => {
  try {
    const { cpe_id, name, description } = req.body;

    if (!cpe_id) {
      return res.status(400).json({ error: 'CPE ID is required' });
    }

    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const queryId = await createQuery(dbInstance, cpe_id, name || null, description || null);

    // Fetch the created query to return complete data
    const createdQuery = await new Promise((resolve, reject) => {
      dbInstance.get('SELECT * FROM queries WHERE id = ?', [queryId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.status(201).json(createdQuery);
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ error: 'Failed to create query' });
  }
});

app.delete('/api/queries/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const changes = await deleteQuery(dbInstance, parseInt(id));

    if (changes === 0) {
      return res.status(404).json({ error: 'Query not found' });
    }

    res.json({ message: 'Query deleted successfully' });
  } catch (error) {
    console.error('Error deleting query:', error);
    res.status(500).json({ error: 'Failed to delete query' });
  }
});

// Manual scan endpoint
app.post('/api/scan', async (req, res) => {
  try {
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const result = await scanner.runScan(dbInstance);
    res.json(result);
  } catch (error) {
    console.error('Error running scan:', error);
    res.status(500).json({ error: 'Failed to run scan', details: error.message });
  }
});

// Test CPE endpoint for debugging
app.post('/api/test-cpe', async (req, res) => {
  try {
    const { cpe_id } = req.body;
    if (!cpe_id) {
      return res.status(400).json({ error: 'CPE ID is required' });
    }

    const nvdClient = require('./nvd-client');
    console.log(`Testing CPE: ${cpe_id}`);
    
    const result = await nvdClient.fetchVulnerabilitiesByCPE(cpe_id, 0, 10);
    
    res.json({
      cpe: cpe_id,
      totalResults: result.totalResults,
      vulnerabilities: result.vulnerabilities.map(v => ({
        cveId: v.cveId,
        severity: v.severity,
        cvssScore: v.cvssScore,
        publishedDate: v.publishedDate
      }))
    });
  } catch (error) {
    console.error('Error testing CPE:', error);
    res.status(500).json({ 
      error: 'Failed to test CPE', 
      details: error.message,
      status: error.response?.status 
    });
  }
});

// Get scan statistics
app.get('/api/stats', async (req, res) => {
  try {
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const stats = await getScanStats(dbInstance);
    const recentNotifications = await getRecentNotifications(dbInstance);
    res.json({
      totalQueries: stats.totalQueries || 0,
      processedCVEs: stats.processedCVEs || 0,
      recentNotifications: recentNotifications || []
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Get queries with CVE statistics
app.get('/api/queries-with-stats', async (req, res) => {
  try {
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const queriesWithStats = await getQueryCVEStats(dbInstance);
    res.json(queriesWithStats);
  } catch (error) {
    console.error('Error fetching queries with stats:', error);
    res.status(500).json({ error: 'Failed to fetch queries with statistics' });
  }
});

// Get CVEs for a specific query
app.get('/api/queries/:id/cves', async (req, res) => {
  try {
    const { id } = req.params;
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const cves = await getCVEsForQuery(dbInstance, parseInt(id));
    res.json(cves);
  } catch (error) {
    console.error('Error fetching CVEs for query:', error);
    res.status(500).json({ error: 'Failed to fetch CVEs for query' });
  }
});

// Catch-all handler for frontend routes - handled by nginx in production
// app.get('*', (req, res) => {
//   res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
// });

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Global database instance
let dbInstance = null;

// Initialize database and start server
async function startServer() {
  try {
    console.log('========================================');
    console.log('MNVD Starting...');
    console.log('========================================');

    console.log('Initializing database...');
    dbInstance = await initializeDatabase();
    console.log('Database initialized successfully');

    // Store db instance for use in routes
    app.locals.db = dbInstance;

    // Temporarily disable scheduled scans for development/testing
    console.log('Scheduled scans disabled for development/testing');
    // Uncomment the following lines when ready for production:
    /*
    console.log('Setting up cron jobs for periodic scans...');
    setInterval(async () => {
      try {
        console.log('Running scheduled scan...');
        await scanner.runScan(dbInstance);
      } catch (error) {
        console.error('Scheduled scan failed:', error);
      }
    }, 21600000); // 6 hours
    console.log('Scheduled scans configured (every 6 hours)');
    */

    app.listen(PORT, () => {
      console.log(`NVD Scanner server running on port ${PORT}`);
      console.log(`Frontend available at http://localhost:${PORT}`);
      console.log('========================================');
      console.log('Server startup complete');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Global error handlers for debugging
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();
