const { initializeDatabase, isCVEProcessed, markCVEProcessed, logScan, getAllQueries, updateQueryLastChecked, getQueryLastChecked } = require('./database');
const nvdClient = require('./nvd-client');
const ScanAccessLayer = require('./sal');

// Scan configuration
const SCAN_DELAY = 6000; // 6 second delay between queries (NVD recommendation)

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

    // Process queries sequentially to respect rate limits
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      console.log(`Processing query ${i + 1} of ${queries.length}: ${query.name || query.cpe_id}`);
      
      await processQuery(db, query, sal);

      // Wait between queries to respect rate limits
      if (i < queries.length - 1) {
        console.log(`Waiting ${SCAN_DELAY / 1000} seconds before next query...`);
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

    // Get the last check time for this query
    const lastChecked = await getQueryLastChecked(db, id);
    console.log(`Last checked: ${lastChecked.toISOString()}`);

    // Check if this is a stale query (more than 30 days since last check)
    const daysSinceLastCheck = Math.floor((Date.now() - lastChecked.getTime()) / (1000 * 60 * 60 * 24));
    const isStaleCheck = daysSinceLastCheck > 30;

    console.log(`${isStaleCheck ? 'Stale check' : 'Recent check'} - ${isStaleCheck ? 'pulling 90 days of data' : 'using optimized approach'} for ${cpe_id}`);
    const vulnerabilities = isStaleCheck
      ? await nvdClient.fetchRecentVulnerabilitiesByCPE(cpe_id, 90)
      : await nvdClient.fetchVulnerabilitiesModifiedSince(cpe_id, lastChecked);

    if (vulnerabilities.length === 0) {
      await logScan(db, id, cpe_id, 'success', 'No new vulnerabilities found');
      console.log(`No new vulnerabilities found for ${cpe_id} since ${lastChecked.toISOString()}`);
      
      // Update last checked time even if no new vulnerabilities
      await updateQueryLastChecked(db, id);
      return;
    }

    console.log(`Found ${vulnerabilities.length} vulnerabilities modified since ${lastChecked.toISOString()}`);

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
      
      // Update last checked time
      await updateQueryLastChecked(db, id);
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
          id, // Use the query ID instead of cpe_id
          vuln // Pass the full vulnerability data
        );
      }

      await logScan(db, id, cpe_id, 'success',
        `Processed ${newVulnerabilities.length} new vulnerabilities`);

      console.log(`Successfully processed ${newVulnerabilities.length} vulnerabilities for ${cpe_id}`);
    } else {
      await logScan(db, id, cpe_id, 'success', 'No new vulnerabilities found');
    }

    // Always update last checked time
    await updateQueryLastChecked(db, id);

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

    // For manual scans, check last 7 days
    const lastCheckDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const vulnerabilities = await nvdClient.fetchVulnerabilitiesModifiedSince(cpeId, lastCheckDate);

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
          await markCVEProcessed(db, vuln.cveId, cpeId, vuln);
        }
      }

      return {
        message: `Found ${newVulnerabilities.length} new vulnerabilities`,
        vulnerabilities: newVulnerabilities,
        notificationSent: success
      };
    }

    return {
      message: `Found ${vulnerabilities.length} vulnerabilities, but all already processed`,
      vulnerabilities: []
    };

  } catch (error) {
    console.error(`Manual scan failed for ${cpeId}:`, error);
    throw error;
  }
}

module.exports = {
  runScan,
  scanSpecificCPE
};
