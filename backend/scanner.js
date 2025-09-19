const { initializeDatabase, isCVEProcessed, markCVEProcessed, logScan, getAllQueries } = require('./database');
const nvdClient = require('./nvd-client');
const ScanAccessLayer = require('./sal');

// Scan configuration
const SCAN_BATCH_SIZE = 5; // Process 5 queries at a time
const SCAN_DELAY = 2000; // 2 second delay between batches

// Main scanning function
async function runScan(db) {
  console.log('Starting NVD vulnerability scan...');

  if (!db) {
    throw new Error('Database connection is required');
  }

  // Initialize SAL
  const sal = new ScanAccessLayer('./data');
  await sal.initialize();

  try {
    // Get all active queries
    const queries = await getAllQueries(db);

    if (queries.length === 0) {
      console.log('No queries found. Skipping scan.');
      return { message: 'No queries found to scan', queriesProcessed: 0 };
    }

    console.log(`Found ${queries.length} queries to process`);

    // Process queries in batches to avoid overwhelming the API
    for (let i = 0; i < queries.length; i += SCAN_BATCH_SIZE) {
      const batch = queries.slice(i, i + SCAN_BATCH_SIZE);
      console.log(`Processing batch ${Math.floor(i / SCAN_BATCH_SIZE) + 1} of ${Math.ceil(queries.length / SCAN_BATCH_SIZE)}`);

      // Process each query in the batch
      const batchPromises = batch.map(query => processQuery(db, query, sal));
      await Promise.allSettled(batchPromises);

      // Wait between batches
      if (i + SCAN_BATCH_SIZE < queries.length) {
        console.log(`Waiting ${SCAN_DELAY / 1000} seconds before next batch...`);
        await new Promise(resolve => setTimeout(resolve, SCAN_DELAY));
      }
    }

    console.log('Scan completed successfully');
    return { 
      message: 'Scan completed successfully', 
      queriesProcessed: queries.length,
      vulnerabilitiesFound: 0 // This would need to be tracked during processing
    };

  } catch (error) {
    console.error('Scan failed:', error);
    throw error;
  }
}

// Process a single query
async function processQuery(db, query, sal) {
  const { id, cpe_id, name } = query;

  try {
    console.log(`Processing query: ${name || cpe_id}`);

    // Validate CPE format
    if (!nvdClient.isValidCPE(cpe_id)) {
      await logScan(db, id, cpe_id, 'error', 'Invalid CPE format');
      console.warn(`Invalid CPE format: ${cpe_id}`);
      return;
    }

    // For development: check recent vulnerabilities AND all vulnerabilities if none found recently
    let vulnerabilities = await nvdClient.fetchRecentVulnerabilitiesByCPE(cpe_id, 30);
    
    if (vulnerabilities.length === 0) {
      console.log(`No recent vulnerabilities found for ${cpe_id}, checking all vulnerabilities...`);
      // Fetch first 10 vulnerabilities regardless of date for testing
      const allVulns = await nvdClient.fetchVulnerabilitiesByCPE(cpe_id, 0, 10);
      vulnerabilities = allVulns.vulnerabilities || [];
      console.log(`Found ${vulnerabilities.length} total vulnerabilities for ${cpe_id}`);
    }

    if (vulnerabilities.length === 0) {
      await logScan(db, id, cpe_id, 'success', 'No new vulnerabilities found');
      console.log(`No new vulnerabilities found for ${cpe_id}`);
      return;
    }

    console.log(`Found ${vulnerabilities.length} vulnerabilities for ${cpe_id}`);

    // Filter out already processed CVEs
    const newVulnerabilities = [];
    for (const vuln of vulnerabilities) {
      const isProcessed = await isCVEProcessed(db, vuln.cveId);
      if (!isProcessed) {
        newVulnerabilities.push(vuln);
      }
    }

    if (newVulnerabilities.length === 0) {
      await logScan(db, id, cpe_id, 'success', 'All vulnerabilities already processed');
      console.log(`All ${vulnerabilities.length} vulnerabilities already processed for ${cpe_id}`);
      return;
    }

    console.log(`${newVulnerabilities.length} new vulnerabilities to process for ${cpe_id}`);

    // Create and execute scan using SAL
    let notificationSuccess = true;

    if (newVulnerabilities.length > 0) {
      try {
        // Create a scan using SAL
        const scanData = {
          type: 'nvd',
          cpeId: cpe_id,
          name: `NVD scan for ${name || cpe_id}`,
          description: `Automated NVD vulnerability scan`,
          config: {
            daysBack: 30
          }
        };

        const scan = await sal.createScan(scanData);
        const scanResult = await sal.executeScan(scan.id);

        notificationSuccess = scanResult.results.notifications.some(n => n.success);
        
        if (notificationSuccess) {
          console.log(`SAL scan completed successfully for ${cpe_id}`);
        } else {
          console.log(`SAL scan completed but notifications failed for ${cpe_id}`);
        }
      } catch (error) {
        console.error(`Failed to execute SAL scan for ${cpe_id}:`, error.message);
        notificationSuccess = false;
      }
      
      if (!notificationSuccess) {
        console.error(`Failed to send notifications for ${cpe_id}`);
        await logScan(db, id, cpe_id, 'warning', 'Scan successful but notifications failed');
      }
    }

    // Always mark CVEs as processed regardless of notification status
    if (newVulnerabilities.length > 0) {
      for (const vuln of newVulnerabilities) {
        await markCVEProcessed(
          db,
          vuln.cveId,
          cpe_id,
          vuln.severity,
          vuln.cvssScore,
          vuln.description,
          vuln.nvdUrl,
          vuln.publishedDate
        );
      }

      await logScan(db, id, cpe_id, 'success',
        `Processed ${newVulnerabilities.length} new vulnerabilities`);

      console.log(`Successfully processed ${newVulnerabilities.length} vulnerabilities for ${cpe_id}`);
    } else {
      await logScan(db, id, cpe_id, 'success', 'No new vulnerabilities found');
    }

  } catch (error) {
    console.error(`Error processing query ${cpe_id}:`, error.message);
    await logScan(db, id, cpe_id, 'error', error.message);
  }
}

// Manual scan for specific CPE (for testing)
async function scanSpecificCPE(cpeId, db) {
  console.log(`Manual scan requested for CPE: ${cpeId}`);

  if (!db) {
    throw new Error('Database connection is required');
  }

  // Initialize SAL
  const sal = new ScanAccessLayer('./data');
  await sal.initialize();

  try {
    if (!nvdClient.isValidCPE(cpeId)) {
      throw new Error('Invalid CPE format');
    }

    const vulnerabilities = await nvdClient.fetchRecentVulnerabilitiesByCPE(cpeId, 7); // Last 7 days

    if (vulnerabilities.length === 0) {
      return { message: 'No vulnerabilities found in the last 7 days' };
    }

    // Check which ones are new
    const newVulnerabilities = [];
    for (const vuln of vulnerabilities) {
      const isProcessed = await isCVEProcessed(db, vuln.cveId);
      if (!isProcessed) {
        newVulnerabilities.push(vuln);
      }
    }

    if (newVulnerabilities.length > 0) {
      // Create and execute scan using SAL
      const scanData = {
        type: 'nvd',
        cpeId: cpeId,
        name: `Manual NVD scan for ${cpeId}`,
        description: `Manual NVD vulnerability scan`,
        config: {
          daysBack: 7
        }
      };

      const scan = await sal.createScan(scanData);
      const scanResult = await sal.executeScan(scan.id);

      const success = scanResult.results.notifications.some(n => n.success);

      if (success) {
        // Mark as processed
        for (const vuln of newVulnerabilities) {
          await markCVEProcessed(
            db,
            vuln.cveId,
            cpeId,
            vuln.severity,
            vuln.cvssScore,
            vuln.description,
            vuln.nvdUrl,
            vuln.publishedDate
          );
        }
      }

      return {
        message: `Found ${newVulnerabilities.length} new vulnerabilities`,
        vulnerabilities: newVulnerabilities,
        notificationSent: success
      };
    } else {
      return {
        message: `Found ${vulnerabilities.length} vulnerabilities, but all already processed`,
        vulnerabilities: []
      };
    }

  } catch (error) {
    console.error(`Manual scan failed for ${cpeId}:`, error);
    throw error;
  }
}

module.exports = {
  runScan,
  scanSpecificCPE
};
