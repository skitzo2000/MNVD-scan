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
  timeout: 30000, // 30 seconds
  headers: {
    'User-Agent': 'NVD-Scanner/1.0.0'
    // Temporarily disabled API key: ...(API_KEY && { 'apiKey': API_KEY })
  }
});

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
      await new Promise(resolve => setTimeout(resolve, waitTime));
      requestCount = 0;
      windowStartTime = Date.now();
    }
  }
  
  // Enforce minimum delay between requests
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < RATE_LIMIT_DELAY) {
    const waitTime = RATE_LIMIT_DELAY - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
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

    // Extract relevant vulnerability information
    const vulnerabilities = data.vulnerabilities?.map(vuln => {
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
    }) || [];

    return {
      vulnerabilities,
      totalResults: data.totalResults || 0,
      startIndex: data.startIndex || 0,
      resultsPerPage: data.resultsPerPage || 0,
      hasMore: (startIndex + resultsPerPage) < (data.totalResults || 0)
    };

  } catch (error) {
    console.error(`Error fetching vulnerabilities for CPE ${cpeId}:`, error.message);

    if (error.response?.status === 429 || error.response?.status === 404) {
      // Rate limited or API key issue - wait and retry once
      console.log(`API returned ${error.response?.status}, waiting 30 seconds before retry...`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      return fetchVulnerabilitiesByCPE(cpeId, startIndex, resultsPerPage);
    }

    // Return empty result instead of throwing to prevent server crashes
    console.log(`Failed to fetch vulnerabilities for CPE ${cpeId}. Returning empty result.`);
    return {
      vulnerabilities: [],
      totalResults: 0,
      startIndex: 0,
      resultsPerPage: 0,
      hasMore: false
    };
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

    const vulnerabilities = data.vulnerabilities?.map(vuln => {
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
    }) || [];

    console.log(`Fetched ${vulnerabilities.length} recent vulnerabilities for CPE ${cpeId}`);
    return vulnerabilities;

  } catch (error) {
    console.error(`Error fetching recent vulnerabilities for CPE ${cpeId}:`, error.message);

    if ((error.response?.status === 429 || error.response?.status === 404) && retryCount < maxRetries) {
      // Rate limited or API key issue - wait and retry once
      console.log(`API returned ${error.response?.status}, waiting 30 seconds before retry... (attempt ${retryCount + 1}/${maxRetries + 1})`);
      await new Promise(resolve => setTimeout(resolve, 30000));
      return fetchRecentVulnerabilitiesByCPE(cpeId, days, retryCount + 1);
    }

    // If we've exhausted retries or it's a different error, return empty array instead of throwing
    console.log(`Failed to fetch vulnerabilities for CPE ${cpeId} after ${retryCount + 1} attempts. Returning empty array.`);
    return [];
  }
}

module.exports = {
  fetchVulnerabilitiesByCPE,
  fetchAllVulnerabilitiesByCPE,
  fetchRecentVulnerabilitiesByCPE,
  isValidCPE
};
