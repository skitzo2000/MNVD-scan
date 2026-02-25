// NVD API Client

const axios = require('axios');

const NVD_API_BASE_URL = 'https://services.nvd.nist.gov/rest/json/cves/2.0';
const API_KEY = process.env.NVD_API_KEY;

// Rate limiting: NVD API allows 50 requests per rolling 30-second window for authenticated users
// We'll be conservative and limit to 40 requests per 30 seconds (1 request every 750ms)
const RATE_LIMIT_DELAY = 750; // 750ms between requests for safety
let lastRequestTime = 0;
let requestCount = 0;
let windowStartTime = Date.now();

// Axios instance with default configuration
const apiClient = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'MNVD-Scanner/1.0.0',
    ...(API_KEY && { 'apiKey': API_KEY }),
  }
});

// Sleep utility
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Parse a single NVD vulnerability response into our format
function parseVulnerability(vuln, cpeId) {
  const cve = vuln.cve;
  const metrics = cve.metrics?.cvssMetricV31?.[0] || cve.metrics?.cvssMetricV30?.[0];

  return {
    cveId: cve.id,
    description: cve.descriptions?.find(d => d.lang === 'en')?.value || 'No description available',
    severity: metrics?.cvssData?.baseSeverity || 'UNKNOWN',
    cvssScore: metrics?.cvssData?.baseScore || 0,
    publishedDate: cve.published,
    lastModifiedDate: cve.lastModified,
    nvdUrl: `https://nvd.nist.gov/vuln/detail/${cve.id}`,
    cpeMatch: cpeId
  };
}

// Parse vulnerability list from NVD response
function parseVulnerabilities(data, cpeId) {
  return data.vulnerabilities?.map(vuln => parseVulnerability(vuln, cpeId)) || [];
}

// Handle API errors with retry logic
async function handleAPIError(error, context, retryCount, maxRetries, retryFn) {
  console.error(`Error fetching ${context}:`, error.message);

  if ((error.response?.status === 429 || error.response?.status === 404) && retryCount < maxRetries) {
    console.log(`API returned ${error.response?.status}, waiting 30 seconds before retry... (attempt ${retryCount + 1}/${maxRetries + 1})`);
    await sleep(30000);
    return retryFn(retryCount + 1);
  }

  console.log(`Failed to fetch ${context} after ${retryCount + 1} attempts. Returning empty result.`);
  return null;
}

// Rate limiting function
async function enforceRateLimit() {
  const now = Date.now();
  
  // Reset window if 30 seconds have passed
  if (now - windowStartTime >= 30000) {
    requestCount = 0;
    windowStartTime = now;
  }
  
  // Check if we're approaching the rate limit
  if (requestCount >= 40) {
    const waitTime = 30000 - (now - windowStartTime);
    if (waitTime > 0) {
      console.log(`Rate limit approaching, waiting ${Math.ceil(waitTime/1000)} seconds...`);
      await sleep(waitTime);
      requestCount = 0;
      windowStartTime = Date.now();
    }
  }
  
  // Enforce minimum delay between requests
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await sleep(waitTime);
  }

  lastRequestTime = Date.now();
  requestCount++;
}

// Fetch vulnerabilities for a specific CPE
async function fetchVulnerabilitiesByCPE(cpeId, startIndex = 0, resultsPerPage = 100) {
  try {
    await enforceRateLimit();

    const params = {
      virtualMatchString: cpeId,
      startIndex,
      resultsPerPage
    };

    console.log(`Fetching vulnerabilities for CPE: ${cpeId} (startIndex: ${startIndex})`);

    const response = await apiClient.get(NVD_API_BASE_URL, { params });

    if (response.status !== 200) {
      throw new Error(`NVD API returned status ${response.status}`);
    }

    const data = response.data;

    const vulnerabilities = parseVulnerabilities(data, cpeId);

    return {
      vulnerabilities,
      totalResults: data.totalResults || 0,
      startIndex: data.startIndex || 0,
      resultsPerPage: data.resultsPerPage || 0,
      hasMore: (startIndex + resultsPerPage) < (data.totalResults || 0)
    };

  } catch (error) {
    const result = await handleAPIError(
      error,
      `vulnerabilities for CPE ${cpeId}`,
      0, 1,
      () => fetchVulnerabilitiesByCPE(cpeId, startIndex, resultsPerPage)
    );
    return result || { vulnerabilities: [], totalResults: 0, startIndex: 0, resultsPerPage: 0, hasMore: false };
  }
}

// Fetch all vulnerabilities for a CPE (handles pagination)
async function fetchAllVulnerabilitiesByCPE(cpeId) {
  const allVulnerabilities = [];
  let startIndex = 0;
  const resultsPerPage = 100;

  try {
    while (true) {
      const result = await fetchVulnerabilitiesByCPE(cpeId, startIndex, resultsPerPage);

      allVulnerabilities.push(...result.vulnerabilities);

      if (!result.hasMore) {
        break;
      }

      startIndex += resultsPerPage;

      // Safety check to prevent infinite loops
      if (startIndex > result.totalResults) {
        console.warn(`Pagination safety check triggered for CPE ${cpeId}`);
        break;
      }
    }

    console.log(`Fetched ${allVulnerabilities.length} vulnerabilities for CPE ${cpeId}`);
    return allVulnerabilities;

  } catch (error) {
    console.error(`Failed to fetch all vulnerabilities for CPE ${cpeId}:`, error);
    throw error;
  }
}

// Validate CPE format (basic validation)
function isValidCPE(cpeId) {
  if (!cpeId || typeof cpeId !== 'string') return false;
  
  // CPE 2.3 format: should start with "cpe:2.3:" and have at least 11 parts total
  if (cpeId.startsWith('cpe:2.3:')) {
    const parts = cpeId.split(':');
    return parts.length >= 11 && /^[aho*]$/.test(parts[2]);
  }
  
  // Legacy CPE format: should start with "cpe:/" and have at least 4 parts
  if (cpeId.startsWith('cpe:/')) {
    const parts = cpeId.split(':');
    return parts.length >= 4 && parts[1].startsWith('/') && /^[aho]$/.test(parts[1].charAt(1));
  }
  
  return false;
}

// Get recent vulnerabilities (last 7 days) for a CPE
async function fetchRecentVulnerabilitiesByCPE(cpeId, days = 7, retryCount = 0) {
  const maxRetries = 1; // Only retry once to prevent infinite loops
  
  try {
    await enforceRateLimit();

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const params = {
      virtualMatchString: cpeId,
      pubStartDate: startDate.toISOString(),
      pubEndDate: endDate.toISOString(),
      resultsPerPage: 100
    };

    console.log(`Fetching recent vulnerabilities for CPE: ${cpeId} (last ${days} days)`);

    const response = await apiClient.get(NVD_API_BASE_URL, { params });

    if (response.status !== 200) {
      throw new Error(`NVD API returned status ${response.status}`);
    }

    const data = response.data;

    const vulnerabilities = parseVulnerabilities(data, cpeId);

    console.log(`Fetched ${vulnerabilities.length} recent vulnerabilities for CPE ${cpeId}`);
    return vulnerabilities;

  } catch (error) {
    const result = await handleAPIError(
      error,
      `recent vulnerabilities for CPE ${cpeId}`,
      retryCount, maxRetries,
      (nextRetry) => fetchRecentVulnerabilitiesByCPE(cpeId, days, nextRetry)
    );
    return result || [];
  }
}

// Fetch vulnerabilities modified since a specific date (optimized approach)
async function fetchVulnerabilitiesModifiedSince(cpeId, lastCheckDate, retryCount = 0) {
  const maxRetries = 1;
  
  try {
    await enforceRateLimit();

    // Use the working pubStartDate approach but with a shorter time window
    const endDate = new Date();
    const startDate = new Date(lastCheckDate);
    
    // For stale queries (>30 days), pull up to 1 year with 90-day minimum
    // For recent checks, limit to 7 days to avoid huge datasets
    const daysSinceLastCheck = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
    const isStaleCheck = daysSinceLastCheck > 30;
    const minWindowDays = isStaleCheck ? 90 : 1;
    const maxWindowDays = isStaleCheck ? 365 : 7;
    const queryWindowDays = Math.min(Math.max(daysSinceLastCheck, minWindowDays), maxWindowDays);

    const adjustedStartDate = new Date();
    adjustedStartDate.setDate(endDate.getDate() - queryWindowDays);

    const params = {
      virtualMatchString: cpeId,
      pubStartDate: adjustedStartDate.toISOString(),
      pubEndDate: endDate.toISOString(),
      resultsPerPage: 100
    };

    console.log(`Fetching vulnerabilities published in last ${queryWindowDays} days for CPE: ${cpeId} ${isStaleCheck ? '(stale check - min 90 days)' : '(recent check - 7 days max)'}`);

    const response = await apiClient.get(NVD_API_BASE_URL, { params });

    if (response.status !== 200) {
      throw new Error(`NVD API returned status ${response.status}`);
    }

    const data = response.data;

    const vulnerabilities = parseVulnerabilities(data, cpeId);

    // Filter by lastModifiedDate on the client side since API doesn't support it
    const filteredVulnerabilities = vulnerabilities.filter(vuln => {
      const vulnLastModified = new Date(vuln.lastModifiedDate);
      return vulnLastModified >= lastCheckDate;
    });

    console.log(`Found ${filteredVulnerabilities.length} vulnerabilities modified since ${lastCheckDate.toISOString()} (from ${vulnerabilities.length} total)`);
    return filteredVulnerabilities;

  } catch (error) {
    const result = await handleAPIError(
      error,
      `modified vulnerabilities for CPE ${cpeId}`,
      retryCount, maxRetries,
      (nextRetry) => fetchVulnerabilitiesModifiedSince(cpeId, lastCheckDate, nextRetry)
    );
    return result || [];
  }
}

// Enhanced function to get complete CPE information including details and first date
async function fetchCompleteCPEInfo(cpeId) {
  try {
    console.log(`Fetching complete CPE information for: ${cpeId}`);
    
    // First, get a sample of vulnerabilities to extract CPE details and find first date
    const result = await fetchVulnerabilitiesByCPE(cpeId, 0, 50);
    
    if (!result.vulnerabilities || result.vulnerabilities.length === 0) {
      console.log(`No vulnerabilities found for ${cpeId}`);
      return {
        cpe_id: cpeId,
        name: null,
        description: null,
        firstDate: null,
        totalVulnerabilities: 0,
        vulnerabilities: []
      };
    }

    // Extract CPE details from the first vulnerability's CPE match
    const firstVuln = result.vulnerabilities[0];
    const cpeMatch = firstVuln.cpeMatch;
    
    // Parse CPE to extract vendor and product information
    const cpeParts = cpeMatch.split(':');
    const vendor = cpeParts[3] || 'Unknown';
    const product = cpeParts[4] || 'Unknown';
    const version = cpeParts[5] || '';
    
    // Create a meaningful name from CPE parts
    const name = `${vendor} ${product}${version ? ` ${version}` : ''}`.trim();
    
    // Create description from CPE information
    const description = `Monitoring ${vendor} ${product} for security vulnerabilities`;
    
    // Find the earliest published date
    const earliestDate = result.vulnerabilities.reduce((earliest, vuln) => {
      const publishedDate = new Date(vuln.publishedDate);
      return !earliest || publishedDate < earliest ? publishedDate : earliest;
    }, null);

    console.log(`Complete CPE info for ${cpeId}: Name=${name}, FirstDate=${earliestDate?.toISOString()}, TotalVulns=${result.totalResults}`);

    return {
      cpe_id: cpeId,
      name: name,
      description: description,
      firstDate: earliestDate?.toISOString() || null,
      totalVulnerabilities: result.totalResults,
      vulnerabilities: result.vulnerabilities.slice(0, 10) // Return first 10 for preview
    };

  } catch (error) {
    console.error(`Error fetching complete CPE info for ${cpeId}:`, error.message);
    return {
      cpe_id: cpeId,
      name: null,
      description: null,
      firstDate: null,
      totalVulnerabilities: 0,
      vulnerabilities: []
    };
  }
}
module.exports = {
  fetchVulnerabilitiesByCPE,
  fetchAllVulnerabilitiesByCPE,
  fetchRecentVulnerabilitiesByCPE,
  fetchVulnerabilitiesModifiedSince,
  fetchCompleteCPEInfo,
  isValidCPE
};
