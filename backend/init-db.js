#!/usr/bin/env node

/**
 * Database initialization script for production
 * This script ensures the database and tables are created before the main application starts
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data/nvd_scanner.db');

async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    console.log('=== Database Initialization Script ===');
    console.log(`Database path: ${DB_PATH}`);
    
    // Ensure the data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      console.log(`Creating data directory: ${dataDir}`);
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
    }
    
    // Check if database already exists
    const dbExists = fs.existsSync(DB_PATH);
    console.log(`Database exists: ${dbExists}`);
    
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        reject(err);
        return;
      }
      
      console.log('Database connection successful');
      
      // Create tables
      const createTables = `
        CREATE TABLE IF NOT EXISTS queries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cpe_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_checked DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS vulnerabilities (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cve_id TEXT UNIQUE NOT NULL,
          description TEXT,
          cvss_score REAL,
          severity TEXT,
          published_date TEXT,
          last_modified_date TEXT,
          cpe_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE TABLE IF NOT EXISTS notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          cve_id TEXT NOT NULL,
          sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (cve_id) REFERENCES vulnerabilities (cve_id)
        );
      `;
      
      db.exec(createTables, (err) => {
        if (err) {
          console.error('Error creating tables:', err);
          reject(err);
          return;
        }
        
        console.log('Database tables created/verified successfully');
        
        // Test the database
        db.get('SELECT COUNT(*) as count FROM queries', (err, row) => {
          if (err) {
            console.error('Error testing database:', err);
            reject(err);
            return;
          }
          
          console.log(`Database test successful. Queries table has ${row.count} records.`);
          db.close((err) => {
            if (err) {
              console.error('Error closing database:', err);
              reject(err);
            } else {
              console.log('Database initialization completed successfully');
              resolve();
            }
          });
        });
      });
    });
  });
}

// Run initialization if this script is called directly
if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Database initialization completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };
