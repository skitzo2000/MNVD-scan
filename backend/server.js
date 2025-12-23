require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
// const cron = require('node-cron'); // Temporarily disabled for debugging

// Import our modules
const { initializeDatabase, getAllQueries, createQuery, deleteQuery, getStats, getRecentNotifications, getQueryCVEStats, getCVEsForQuery, getSettings, updateSettings, getEffectiveSettings } = require('./database');
const nvdClient = require('./nvd-client');
const discordNotifier = require('./discord-notifier');
const scanner = require('./scanner');
const notificationService = require('./notification-service');

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

    // Check for duplicate CPE
    const existingQueries = await getAllQueries(dbInstance);
    const duplicateQuery = existingQueries.find(query => query.cpe_id === cpe_id);
    
    if (duplicateQuery) {
      return res.status(409).json({ 
        error: 'CPE already exists', 
        message: `A query with CPE "${cpe_id}" already exists`,
        existingQuery: {
          id: duplicateQuery.id,
          name: duplicateQuery.name,
          cpe_id: duplicateQuery.cpe_id
        }
      });
    }

    let finalName = name;
    let finalDescription = description;

    // Auto-fetch CPE details if name/description are empty
    if (!name || !description) {
      try {
        const nvdClient = require('./nvd-client');
        console.log(`Auto-fetching CPE details for: ${cpe_id}`);
        
        // Use existing function to get vulnerability data
        const result = await nvdClient.fetchVulnerabilitiesByCPE(cpe_id, 0, 10);
        
        if (result.vulnerabilities && result.vulnerabilities.length > 0) {
          // Extract CPE details from the first vulnerability
          const firstVuln = result.vulnerabilities[0];
          const cpeMatch = firstVuln.cpeMatch;
          
          // Parse CPE to extract vendor and product information
          const cpeParts = cpeMatch.split(':');
          const vendor = cpeParts[3] || 'Unknown';
          const product = cpeParts[4] || 'Unknown';
          const version = cpeParts[5] || '';
          
          // Create meaningful name and description
          if (!finalName) {
            finalName = `${vendor} ${product}${version ? ` ${version}` : ''}`.trim();
          }
          if (!finalDescription) {
            finalDescription = `Monitoring ${vendor} ${product} for security vulnerabilities`;
          }
          
          console.log(`Auto-fetched details - Name: ${finalName}, Description: ${finalDescription}`);
        }
      } catch (error) {
        console.error('Error auto-fetching CPE details:', error);
        // Continue with user-provided data even if auto-fetch fails
      }
    }

    const createdQuery = await createQuery(dbInstance, {
      cpe_id,
      name: finalName || null,
      description: finalDescription || null
    });

    res.status(201).json(createdQuery);
  } catch (error) {
    console.error('Error creating query:', error);
    res.status(500).json({ error: 'Failed to create query' });
  }
});

// Get CVEs for a specific query
app.get('/api/queries/:id/cves', async (req, res) => {
  try {
    const { id } = req.params;
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    const cves = await getCVEsForQuery(dbInstance, id);
    res.json(cves);
  } catch (error) {
    console.error('Error fetching CVEs for query:', error);
    res.status(500).json({ error: 'Failed to fetch CVEs for query' });
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
    const stats = await getStats(dbInstance);
    const recentNotifications = await getRecentNotifications(dbInstance);
    res.json({
      totalQueries: stats.totalQueries || 0,
      processedCVEs: stats.totalCVEs || 0,  // Change from totalCVEs to processedCVEs
      totalScans: stats.totalScans || 0,
      totalNotifications: stats.totalNotifications || 0,
      lastScan: stats.lastScan,
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
    const queries = await getAllQueries(dbInstance);
    const queriesWithStats = await Promise.all(
      queries.map(async (query) => {
        const stats = await getQueryCVEStats(dbInstance, query.id);
        return {
          ...query,
          ...stats  // Flatten the stats directly onto the query object
        };
      })
    );
    res.json(queriesWithStats);
  } catch (error) {
    console.error('Error fetching queries with stats:', error);
    res.status(500).json({ error: 'Failed to fetch queries with statistics' });
  }
});

// Settings endpoints
app.get('/api/settings', async (req, res) => {
  try {
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const settings = await getSettings(dbInstance);
    const effectiveSettings = await getEffectiveSettings(dbInstance);
    
    // Mask the API key if it exists
    const maskedSettings = {
      nvdApiKey: settings.nvdApiKey ? '********' : null,
      nvdApiKeySet: !!settings.nvdApiKey,
      webhookUrl: settings.webhookUrl,
      webhookUrlSet: !!settings.webhookUrl,
      effectiveSource: effectiveSettings.source,
      updatedAt: settings.updatedAt
    };
    
    res.json(maskedSettings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  try {
    if (!dbInstance) {
      return res.status(500).json({ error: 'Database not initialized' });
    }
    
    const { nvdApiKey, webhookUrl } = req.body;
    
    // Build update object (only include fields that are provided)
    const updates = {};
    
    if (nvdApiKey !== undefined) {
      // Only update if not empty or explicitly clearing
      if (nvdApiKey === null || nvdApiKey === '') {
        updates.nvdApiKey = null;
      } else if (nvdApiKey !== '********') {
        // Don't update if it's the masked placeholder
        updates.nvdApiKey = nvdApiKey;
      }
    }
    
    if (webhookUrl !== undefined) {
      updates.webhookUrl = webhookUrl || null;
    }
    
    const updatedSettings = await updateSettings(dbInstance, updates);
    
    // Return masked response
    const maskedSettings = {
      nvdApiKey: updatedSettings.nvdApiKey ? '********' : null,
      nvdApiKeySet: !!updatedSettings.nvdApiKey,
      webhookUrl: updatedSettings.webhookUrl,
      webhookUrlSet: !!updatedSettings.webhookUrl,
      updatedAt: updatedSettings.updatedAt
    };
    
    res.json(maskedSettings);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

app.post('/api/settings/test', async (req, res) => {
  try {
    const { nvdApiKey, webhookUrl } = req.body;
    const results = {
      nvdApi: { success: false, message: '' },
      webhook: { success: false, message: '' }
    };
    
    // Test NVD API if key provided
    if (nvdApiKey && nvdApiKey !== '********') {
      try {
        // Validate API key format first
        if (!nvdClient.isValidApiKeyFormat(nvdApiKey)) {
          results.nvdApi.success = false;
          results.nvdApi.message = 'Invalid API key format (expected UUID format)';
        } else {
          // Temporarily use the test API key without modifying global env
          nvdClient.setApiKey(nvdApiKey, 'test');
          
          // Test with a simple query
          const testResult = await nvdClient.fetchVulnerabilitiesByCPE('cpe:2.3:a:microsoft:edge:*:*:*:*:*:*:*:*', 0, 1);
          
          // Restore the original API key from database/env
          const effectiveSettings = await getEffectiveSettings(dbInstance);
          if (effectiveSettings.nvdApiKey) {
            nvdClient.setApiKey(effectiveSettings.nvdApiKey, effectiveSettings.source.nvdApiKey);
          }
          
          results.nvdApi.success = true;
          results.nvdApi.message = 'API key is valid';
        }
      } catch (error) {
        // Restore the original API key even if test fails
        const effectiveSettings = await getEffectiveSettings(dbInstance);
        if (effectiveSettings.nvdApiKey) {
          nvdClient.setApiKey(effectiveSettings.nvdApiKey, effectiveSettings.source.nvdApiKey);
        }
        
        results.nvdApi.success = false;
        results.nvdApi.message = `API test failed: ${error.message}`;
      }
    } else {
      results.nvdApi.message = 'No API key provided to test';
    }
    
    // Test webhook if URL provided
    if (webhookUrl) {
      try {
        const testVulnerability = {
          cveId: 'TEST-2024-0000',
          description: 'This is a test notification from MNVD Settings',
          severity: 'LOW',
          cvssScore: 0.0,
          nvdUrl: 'https://nvd.nist.gov',
          cpeMatch: 'test:webhook',
          publishedDate: new Date().toISOString()
        };
        
        const success = await notificationService.sendNotification(webhookUrl, testVulnerability);
        
        results.webhook.success = success;
        results.webhook.message = success ? 'Webhook test notification sent successfully' : 'Failed to send webhook test notification';
      } catch (error) {
        results.webhook.success = false;
        results.webhook.message = `Webhook test failed: ${error.message}`;
      }
    } else {
      results.webhook.message = 'No webhook URL provided to test';
    }
    
    res.json(results);
  } catch (error) {
    console.error('Error testing settings:', error);
    res.status(500).json({ error: 'Failed to test settings', details: error.message });
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
    
    // Load settings from database and set API key in nvd-client
    try {
      const effectiveSettings = await getEffectiveSettings(dbInstance);
      if (effectiveSettings.nvdApiKey) {
        nvdClient.setApiKey(effectiveSettings.nvdApiKey, effectiveSettings.source.nvdApiKey);
        console.log(`NVD API key loaded from ${effectiveSettings.source.nvdApiKey}`);
      } else {
        console.warn('No NVD API key configured. API calls may be rate-limited.');
      }
      
      if (effectiveSettings.webhookUrl) {
        console.log(`Webhook URL configured from ${effectiveSettings.source.webhookUrl}`);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }

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
