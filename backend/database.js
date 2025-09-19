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

async function markCVEProcessed(dal, cveId, queryId) {
  return await dal.createCVE({ cveId, queryId, processed: true });
}

async function logScan(dal, scanData) {
  return await dal.createScan(scanData);
}

async function getQueryCVEStats(dal, queryId) {
  const cves = await dal.getCVEsForQuery(queryId);
  return {
    total: cves.length,
    high: cves.filter(cve => cve.severity === 'HIGH').length,
    medium: cves.filter(cve => cve.severity === 'MEDIUM').length,
    low: cves.filter(cve => cve.severity === 'LOW').length
  };
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
  getQueryCVEStats
};