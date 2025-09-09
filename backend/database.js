const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Use the data directory for the database
const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data/nvd_scanner.db');

// Initialize database connection
async function initializeDatabase() {
  return new Promise((resolve, reject) => {
    // Ensure the data directory exists and has proper permissions
    const dataDir = path.dirname(DB_PATH);
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
        console.log(`Created data directory: ${dataDir}`);
      } else {
        console.log(`Data directory exists: ${dataDir}`);
      }

      // Check directory permissions
      const stats = fs.statSync(dataDir);
      console.log(`Data directory permissions: ${stats.mode.toString(8)}`);
    } catch (dirErr) {
      console.error('Error with data directory:', dirErr);
      reject(dirErr);
      return;
    }

    console.log(`Attempting to connect to database at: ${DB_PATH}`);

    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Database connection error:', err);
        console.error('Database path:', DB_PATH);
        console.error('Current working directory:', process.cwd());
        reject(err);
        return;
      }

      console.log('Database connection successful');

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON', (pragmaErr) => {
        if (pragmaErr) {
          console.error('Error setting foreign keys:', pragmaErr);
        }

        // Create tables only if they don't exist
        console.log('Ensuring database tables exist...');
        createTables(db)
          .then(() => {
            console.log('Database tables verified/created successfully');
            
            // Test query to verify data exists
            db.all('SELECT COUNT(*) as count FROM queries', (countErr, rows) => {
              if (countErr) {
                console.error('Error counting queries:', countErr);
              } else {
                console.log(`Database contains ${rows[0].count} queries`);
              }
              resolve(db);
            });
          })
          .catch((tableErr) => {
            console.error('Error creating tables:', tableErr);
            reject(tableErr);
          });
      });
    });
  });
}

// Create database tables
async function createTables(db) {
  console.log('Setting up database schema...');

  // Queries table - stores user-defined CPE queries
  const createQueriesTable = 'CREATE TABLE IF NOT EXISTS queries (id INTEGER PRIMARY KEY AUTOINCREMENT, cpe_id TEXT NOT NULL, name TEXT, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)';

  // Processed CVEs table - tracks which CVEs have been processed to avoid duplicates
  const createProcessedCVEsTable = 'CREATE TABLE IF NOT EXISTS processed_cves (id INTEGER PRIMARY KEY AUTOINCREMENT, cve_id TEXT NOT NULL UNIQUE, cpe_id TEXT NOT NULL, severity TEXT, cvss_score REAL, description TEXT, nvd_url TEXT, published_date TEXT, processed_at DATETIME DEFAULT CURRENT_TIMESTAMP)';

  // Scan logs table - for debugging and monitoring
  const createScanLogsTable = 'CREATE TABLE IF NOT EXISTS scan_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, query_id INTEGER, cpe_id TEXT, status TEXT, message TEXT, scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (query_id) REFERENCES queries (id))';

  // Create tables sequentially
  try {
    console.log('Creating queries table...');
    await runQuery(db, createQueriesTable);
    console.log('Queries table created successfully');

    console.log('Creating processed_cves table...');
    await runQuery(db, createProcessedCVEsTable);
    console.log('Processed CVEs table created successfully');

    console.log('Creating scan_logs table...');
    await runQuery(db, createScanLogsTable);
    console.log('Scan logs table created successfully');

    console.log('All tables created successfully');

    // Migration: Add published_date column if it doesn't exist
    console.log('Running database migrations...');
    await runMigrations(db);
    console.log('Database migrations completed');
  } catch (err) {
    console.error('Error creating tables:', err);
    throw err;
  }
}

// Helper function to run SQL queries as promises
function runQuery(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

// Database migrations
async function runMigrations(db) {
  try {
    // Check if published_date column exists in processed_cves table
    const tableInfo = await new Promise((resolve, reject) => {
      db.all("PRAGMA table_info(processed_cves)", (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    const hasPublishedDate = tableInfo.some(col => col.name === 'published_date');

    if (!hasPublishedDate) {
      console.log('Adding published_date column to processed_cves table...');
      await runQuery(db, 'ALTER TABLE processed_cves ADD COLUMN published_date TEXT');
      console.log('Published date column added successfully');
    } else {
      console.log('Published date column already exists, skipping migration');
    }

    // Backfill published dates for existing CVEs
    await backfillPublishedDates(db);
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Backfill published dates for existing CVEs
async function backfillPublishedDates(db) {
  try {
    console.log('Checking for CVEs with missing published dates...');
    
    // Get CVEs without published dates
    const cvesWithoutDates = await new Promise((resolve, reject) => {
      db.all('SELECT cve_id FROM processed_cves WHERE published_date IS NULL', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    if (cvesWithoutDates.length === 0) {
      console.log('All CVEs already have published dates');
      return;
    }

    console.log(`Found ${cvesWithoutDates.length} CVEs missing published dates`);
    
    // For existing CVEs, we'll extract the year from CVE ID and create an estimated date
    // CVE format: CVE-YYYY-NNNNN where YYYY is the year
    for (const cve of cvesWithoutDates) {
      try {
        const cveMatch = cve.cve_id.match(/CVE-(\d{4})-\d+/);
        if (cveMatch) {
          const year = cveMatch[1];
          // Use January 1st of the CVE year as a fallback date
          const estimatedDate = `${year}-01-01T00:00:00.000Z`;
          
          await new Promise((resolve, reject) => {
            db.run(
              'UPDATE processed_cves SET published_date = ? WHERE cve_id = ?',
              [estimatedDate, cve.cve_id],
              function(err) {
                if (err) reject(err);
                else resolve();
              }
            );
          });
          
          console.log(`Updated ${cve.cve_id} with estimated date ${year}-01-01`);
        }
      } catch (updateError) {
        console.error(`Error updating ${cve.cve_id}:`, updateError);
      }
    }
    
    console.log(`Backfilled published dates for ${cvesWithoutDates.length} CVEs`);
  } catch (error) {
    console.error('Error in backfillPublishedDates:', error);
  }
}

// Helper function to check if CVE has been processed
async function isCVEProcessed(db, cveId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM processed_cves WHERE cve_id = ?', [cveId], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(!!row);
    });
  });
}

// Helper function to mark CVE as processed
async function markCVEProcessed(db, cveId, cpeId, severity, cvssScore, description, nvdUrl, publishedDate) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO processed_cves (cve_id, cpe_id, severity, cvss_score, description, nvd_url, published_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [cveId, cpeId, severity, cvssScore, description, nvdUrl, publishedDate], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Helper function to log scan activity
async function logScan(db, queryId, cpeId, status, message) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO scan_logs (query_id, cpe_id, status, message)
      VALUES (?, ?, ?, ?)
    `;

    db.run(sql, [queryId, cpeId, status, message], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Helper function to get all queries
async function getAllQueries(db) {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM queries ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Helper function to create a new query
async function createQuery(db, cpeId, name, description) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO queries (cpe_id, name, description) VALUES (?, ?, ?)';
    db.run(sql, [cpeId, name, description], function(err) {
      if (err) {
        reject(err);
        return;
      }
      resolve(this.lastID);
    });
  });
}

// Helper function to delete a query
async function deleteQuery(db, id) {
  return new Promise((resolve, reject) => {
    // First, get the cpe_id of the query we want to delete
    db.get('SELECT cpe_id FROM queries WHERE id = ?', [id], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!row) {
        reject(new Error('Query not found'));
        return;
      }
      
      const cpeId = row.cpe_id;
      
      // Delete related CVEs first
      db.run('DELETE FROM processed_cves WHERE cpe_id = ?', [cpeId], (cveErr) => {
        if (cveErr) {
          reject(cveErr);
          return;
        }
        
        // Delete related scan logs
        db.run('DELETE FROM scan_logs WHERE query_id = ?', [id], (logErr) => {
          if (logErr) {
            reject(logErr);
            return;
          }
          
          // Finally, delete the query itself
          db.run('DELETE FROM queries WHERE id = ?', [id], function(queryErr) {
            if (queryErr) {
              reject(queryErr);
              return;
            }
            resolve(this.changes);
          });
        });
      });
    });
  });
}

// Helper function to get scan statistics
async function getScanStats(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        (SELECT COUNT(*) FROM queries) as totalQueries,
        (SELECT COUNT(*) FROM processed_cves) as processedCVEs,
        (SELECT COUNT(*) FROM processed_cves WHERE processed_at >= datetime('now', '-7 days')) as recentProcessed
    `;

    db.get(sql, [], (err, row) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Helper function to get recent notifications
async function getRecentNotifications(db, limit = 5) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT cve_id, cpe_id, severity, cvss_score, description, nvd_url, processed_at
      FROM processed_cves
      ORDER BY processed_at DESC
      LIMIT ?
    `;

    db.all(sql, [limit], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

// Helper function to get CVE statistics for all queries
async function getQueryCVEStats(db) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        q.id,
        q.cpe_id,
        q.name,
        q.description,
        q.created_at,
        COUNT(CASE WHEN pc.severity IN ('CRITICAL', 'HIGH') THEN 1 END) as critical_high_count,
        COUNT(CASE WHEN pc.severity = 'MEDIUM' THEN 1 END) as medium_count,
        COUNT(CASE WHEN pc.severity = 'LOW' THEN 1 END) as low_count,
        COUNT(pc.cve_id) as total_cves,
        COALESCE(MAX(CASE 
          WHEN pc.severity = 'CRITICAL' THEN 4
          WHEN pc.severity = 'HIGH' THEN 3
          WHEN pc.severity = 'MEDIUM' THEN 2
          WHEN pc.severity = 'LOW' THEN 1
          ELSE 0
        END), 0) as highest_severity_level
      FROM queries q
      LEFT JOIN processed_cves pc ON q.cpe_id = pc.cpe_id
      GROUP BY q.id, q.cpe_id, q.name, q.description, q.created_at
      ORDER BY q.created_at DESC
    `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows.map(row => ({
        ...row,
        highest_severity: row.highest_severity_level === 4 ? 'CRITICAL' :
                         row.highest_severity_level === 3 ? 'HIGH' :
                         row.highest_severity_level === 2 ? 'MEDIUM' :
                         row.highest_severity_level === 1 ? 'LOW' : 'NONE'
      })));
    });
  });
}

// Helper function to get all CVEs for a specific query
async function getCVEsForQuery(db, queryId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT 
        pc.cve_id,
        pc.severity,
        pc.cvss_score,
        pc.description,
        pc.nvd_url,
        pc.published_date,
        pc.processed_at,
        q.cpe_id,
        q.name as query_name
      FROM processed_cves pc
      JOIN queries q ON pc.cpe_id = q.cpe_id
      WHERE q.id = ?
      ORDER BY 
        CASE pc.severity
          WHEN 'CRITICAL' THEN 1
          WHEN 'HIGH' THEN 2
          WHEN 'MEDIUM' THEN 3
          WHEN 'LOW' THEN 4
          ELSE 5
        END,
        pc.published_date DESC
    `;

    db.all(sql, [queryId], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(rows);
    });
  });
}

module.exports = {
  initializeDatabase,
  isCVEProcessed,
  markCVEProcessed,
  logScan,
  getAllQueries,
  createQuery,
  deleteQuery,
  getScanStats,
  getRecentNotifications,
  getQueryCVEStats,
  getCVEsForQuery
};
