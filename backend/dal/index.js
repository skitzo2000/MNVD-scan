// Data Access Layer (DAL) - Abstracts data storage from business logic
const fs = require('fs').promises;
const path = require('path');

class DataAccessLayer {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.queriesFile = path.join(dataDir, 'queries.json');
    this.cvesFile = path.join(dataDir, 'cves.json');
    this.scansFile = path.join(dataDir, 'scans.json');
    this.notificationsFile = path.join(dataDir, 'notifications.json');
  }

  async initialize() {
    // Ensure data directory exists
    await fs.mkdir(this.dataDir, { recursive: true });
    
    // Initialize files with empty arrays if they don't exist
    const files = [
      this.queriesFile,
      this.cvesFile,
      this.scansFile,
      this.notificationsFile
    ];

    for (const file of files) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify([], null, 2));
      }
    }
  }

  // Generic file operations
  async readFile(filePath) {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error(`Error reading file ${filePath}:`, error);
      return [];
    }
  }

  async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, JSON.stringify(data, null, 2));
      return true;
    } catch (error) {
      console.error(`Error writing file ${filePath}:`, error);
      return false;
    }
  }

  // Query operations
  async getAllQueries() {
    return await this.readFile(this.queriesFile);
  }

  async createQuery(query) {
    const queries = await this.getAllQueries();
    const newQuery = {
      id: Date.now().toString(),
      ...query,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    queries.push(newQuery);
    await this.writeFile(this.queriesFile, queries);
    return newQuery;
  }

  async updateQuery(id, updates) {
    const queries = await this.getAllQueries();
    const index = queries.findIndex(q => q.id === id);
    if (index !== -1) {
      queries[index] = { ...queries[index], ...updates, updatedAt: new Date().toISOString() };
      await this.writeFile(this.queriesFile, queries);
      return queries[index];
    }
    return null;
  }

  async deleteQuery(id) {
    const queries = await this.getAllQueries();
    const filtered = queries.filter(q => q.id !== id);
    await this.writeFile(this.queriesFile, filtered);
    return true;
  }

  // CVE operations
  async getAllCVEs() {
    return await this.readFile(this.cvesFile);
  }

  async createCVE(cve) {
    const cves = await this.getAllCVEs();
    const newCVE = {
      id: cve.cveId || Date.now().toString(),
      ...cve,
      createdAt: new Date().toISOString()
    };
    cves.push(newCVE);
    await this.writeFile(this.cvesFile, cves);
    return newCVE;
  }

  async getCVEsForQuery(queryId) {
    const cves = await this.getAllCVEs();
    return cves.filter(cve => cve.queryId === queryId);
  }

  // Scan operations
  async createScan(scanData) {
    const scans = await this.readFile(this.scansFile);
    const newScan = {
      id: Date.now().toString(),
      ...scanData,
      timestamp: new Date().toISOString()
    };
    scans.push(newScan);
    await this.writeFile(this.scansFile, scans);
    return newScan;
  }

  async getRecentScans(limit = 10) {
    const scans = await this.readFile(this.scansFile);
    return scans
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Notification operations
  async createNotification(notification) {
    const notifications = await this.readFile(this.notificationsFile);
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString()
    };
    notifications.push(newNotification);
    await this.writeFile(this.notificationsFile, notifications);
    return newNotification;
  }

  async getRecentNotifications(limit = 10) {
    const notifications = await this.readFile(this.notificationsFile);
    return notifications
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Statistics
  async getStats() {
    const queries = await this.getAllQueries();
    const cves = await this.getAllCVEs();
    const scans = await this.readFile(this.scansFile);
    const notifications = await this.readFile(this.notificationsFile);

    return {
      totalQueries: queries.length,
      totalCVEs: cves.length,
      totalScans: scans.length,
      totalNotifications: notifications.length,
      lastScan: scans.length > 0 ? scans[scans.length - 1].timestamp : null
    };
  }
}

module.exports = DataAccessLayer;
