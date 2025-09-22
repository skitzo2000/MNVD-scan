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
    

    // Initialize files with the structure each layer expects
    const fileStructures = {
      [this.queriesFile]: [], // DAL expects direct array
      [this.cvesFile]: [], // DAL expects direct array
      [this.scansFile]: { // SAL expects object structure

        scans: [],
        stats: {
          totalScans: 0,
          successfulScans: 0,
          failedScans: 0,

          byType: {
            nvd: 0,
            custom: 0,
            scheduled: 0,
            manual: 0
          },
          byStatus: {
            completed: 0,
            running: 0,

            failed: 0,
            cancelled: 0
          }
        }
      },

      [this.notificationsFile]: [] // DAL expects direct array

    };

    for (const [file, structure] of Object.entries(fileStructures)) {
      try {
        await fs.access(file);
      } catch {
        await fs.writeFile(file, JSON.stringify(structure, null, 2));
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
    const data = await this.readFile(this.queriesFile);
    return data;
  }

  async createQuery(query) {
    const data = await this.readFile(this.queriesFile);
    const newQuery = {
      id: Date.now().toString(),
      ...query,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.push(newQuery);
    await this.writeFile(this.queriesFile, data);
    return newQuery;
  }

  async updateQuery(id, updates) {
    const data = await this.readFile(this.queriesFile);
    const index = data.findIndex(q => q.id === id);
    if (index !== -1) {
      data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
      await this.writeFile(this.queriesFile, data);
      return data[index];
    }
    return null;
  }

  async deleteQuery(id) {
    const data = await this.readFile(this.queriesFile);
    const filtered = data.filter(q => q.id !== id);
    await this.writeFile(this.queriesFile, filtered);
    return true;
  }

  // CVE operations
  async getAllCVEs() {
    const data = await this.readFile(this.cvesFile);
    return data;
  }

  async createCVE(cve) {
    const data = await this.readFile(this.cvesFile);
    const newCVE = {
      id: cve.cveId || Date.now().toString(),
      ...cve,
      createdAt: new Date().toISOString()
    };

    data.push(newCVE);
    await this.writeFile(this.cvesFile, data);
    return newCVE;
  }

  async getCVEsForQuery(queryId) {
    const cves = await this.getAllCVEs();
    return cves.filter(cve => cve.queryId === queryId);
  }

  // Scan operations
  async createScan(scanData) {
    const data = await this.readFile(this.scansFile);
    const newScan = {
      id: Date.now().toString(),
      ...scanData,
      timestamp: new Date().toISOString()
    };
    
    // Handle both array format and object format
    if (Array.isArray(data)) {
      data.push(newScan);
      await this.writeFile(this.scansFile, data);
    } else {
      // Object format with scans array
      if (!data.scans) data.scans = [];
      data.scans.push(newScan);
      await this.writeFile(this.scansFile, data);
    }
    return newScan;
  }

  async getRecentScans(limit = 10) {
    const data = await this.readFile(this.scansFile);
    
    // Handle both array format and object format
    const scans = Array.isArray(data) ? data : (data.scans || []);
    return scans
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Notification operations
  async createNotification(notification) {
    const data = await this.readFile(this.notificationsFile);
    const newNotification = {
      id: Date.now().toString(),
      ...notification,
      timestamp: new Date().toISOString()
    };
    data.push(newNotification);
    await this.writeFile(this.notificationsFile, data);
    return newNotification;
  }

  async getRecentNotifications(limit = 10) {
    const data = await this.readFile(this.notificationsFile);
    return data
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  // Statistics
  async getStats() {
    const queriesData = await this.readFile(this.queriesFile);
    const cvesData = await this.readFile(this.cvesFile);
    const scansData = await this.readFile(this.scansFile);
    const notificationsData = await this.readFile(this.notificationsFile);

    // Handle different data structures
    const queries = Array.isArray(queriesData) ? queriesData : [];
    const cves = Array.isArray(cvesData) ? cvesData : [];
    const scans = Array.isArray(scansData) ? scansData : (scansData.scans || []);
    const notifications = Array.isArray(notificationsData) ? notificationsData : [];

    return {
      totalQueries: queriesData.queries?.length || 0,
      totalCVEs: cvesData.cves?.length || 0,
      totalScans: scansData.scans?.length || 0,
      totalNotifications: notificationsData.notifications?.length || 0,
      lastScan: scansData.scans?.length > 0 ? scansData.scans[scansData.scans.length - 1].timestamp : null
    };
  }
}

module.exports = DataAccessLayer;
