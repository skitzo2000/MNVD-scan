const DataAccessLayer = require('./dal');
const path = require('path');

// Use the data directory for JSON file storage
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');

// Initialize data access layer
async function initializeDatabase() {
    try {
    console.log(`Initializing Data Access Layer...`);
    console.log(`Data directory: ${DATA_DIR}`);
      console.log(`Current working directory: ${process.cwd()}`);
      console.log(`Process UID: ${process.getuid()}`);
      console.log(`Process GID: ${process.getgid()}`);
      
    // Create DAL instance
    const dal = new DataAccessLayer(DATA_DIR);
    
    // Initialize the DAL (creates directory and files if needed)
    await dal.initialize();
    console.log('Data Access Layer initialized successfully');
    
    // Test the DAL
    const stats = await dal.getStats();
    console.log(`Data Access Layer contains:`, stats);
    console.log('Database initialization complete');
    
    return dal;
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

// Query operations
async function getAllQueries(dal) {
  return await dal.getAllQueries();
}

async function createQuery(dal, query) {
  return await dal.createQuery(query);
}

async function updateQuery(dal, id, updates) {
  return await dal.updateQuery(id, updates);
}

async function deleteQuery(dal, id) {
  return await dal.deleteQuery(id);
}

// CVE operations
async function getAllCVEs(dal) {
  return await dal.getAllCVEs();
}

async function createCVE(dal, cve) {
  return await dal.createCVE(cve);
}

async function getCVEsForQuery(dal, queryId) {
  return await dal.getCVEsForQuery(queryId);
}

// Scan operations
async function createScan(dal, scanData) {
  return await dal.createScan(scanData);
}

async function getRecentScans(dal, limit = 10) {
  return await dal.getRecentScans(limit);
}

// Notification operations
async function createNotification(dal, notification) {
  return await dal.createNotification(notification);
}

async function getRecentNotifications(dal, limit = 10) {
  return await dal.getRecentNotifications(limit);
}

// Statistics
async function getStats(dal) {
  return await dal.getStats();
}

// Legacy compatibility functions (for existing code)
async function isCVEProcessed(dal, cveId) {
  const cves = await dal.getAllCVEs();
  return cves.some(cve => cve.cveId === cveId);
}

async function markCVEProcessed(dal, cveId, queryId, vulnerabilityData = null) {
  const cveData = {
    cveId,
    queryId,
    processed: true,
    createdAt: new Date().toISOString()
  };
  
  // Add vulnerability data if provided
  if (vulnerabilityData) {
    cveData.severity = vulnerabilityData.severity;
    cveData.cvssScore = vulnerabilityData.cvssScore;
    cveData.description = vulnerabilityData.description;
    cveData.nvdUrl = vulnerabilityData.nvdUrl;
    cveData.publishedDate = vulnerabilityData.publishedDate;
    cveData.lastModifiedDate = vulnerabilityData.lastModifiedDate;
  }
  
  return await dal.createCVE(cveData);
}

async function logScan(dal, scanData) {
  return await dal.createScan(scanData);
}

async function getQueryCVEStats(dal, queryId) {
  const cves = await dal.getCVEsForQuery(queryId);
  return {
    totalCves: cves.length,
    criticalHighCount: cves.filter(cve => cve.severity === 'HIGH' || cve.severity === 'CRITICAL').length,
    mediumCount: cves.filter(cve => cve.severity === 'MEDIUM').length,
    lowCount: cves.filter(cve => cve.severity === 'LOW').length
  };
}

// Track last check time for queries
async function updateQueryLastChecked(dal, queryId) {
  const queries = await dal.getAllQueries();
  const query = queries.find(query => query.id === queryId);
  if (!query) {
    console.warn(`Query ${queryId} not found for last-check update`);
    return;
  }
  query.lastChecked = new Date().toISOString();
  await dal.updateQuery(query);
  console.log(`Updated last checked time for query ${queryId}: ${query.lastChecked}`);
}

async function getQueryLastChecked(dal, queryId) {
  const queries = await dal.getAllQueries();
  const query = queries.find(query => query.id === queryId);
  if (query?.lastChecked) {
    return new Date(query.lastChecked);
  }
  // Default to 60 days ago for first-time queries to ensure we get 30 days of data
  return new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
}

module.exports = {
  initializeDatabase,
  getAllQueries,
  createQuery,
  updateQuery,
  deleteQuery,
  getAllCVEs,
  createCVE,
  getCVEsForQuery,
  createScan,
  getRecentScans,
  createNotification,
  getRecentNotifications,
  getStats,
  isCVEProcessed,
  markCVEProcessed,
  logScan,
  getQueryCVEStats,
  updateQueryLastChecked,
  getQueryLastChecked
};