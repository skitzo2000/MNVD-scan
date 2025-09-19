// SWR configuration for better performance and caching
export const swrConfig = {
  // Global configuration for all SWR hooks
  revalidateOnFocus: false, // Don't revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when network reconnects
  refreshInterval: 30000, // Auto-refresh every 30 seconds
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  errorRetryCount: 3, // Retry failed requests 3 times
  errorRetryInterval: 5000, // Wait 5 seconds between retries
  loadingTimeout: 10000, // Timeout after 10 seconds
};

// Custom fetcher with error handling
export const fetcher = async (url) => {
  const res = await fetch(url);
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.');
    error.info = await res.json();
    error.status = res.status;
    throw error;
  }
  
  return res.json();
};
