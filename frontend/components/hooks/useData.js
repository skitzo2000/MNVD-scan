import useSWR from 'swr';
import axios from 'axios';

// Optimized fetcher function for SWR with error handling
const fetcher = async (url) => {
  try {
    const response = await axios.get(url);
    return response.data;
  } catch (error) {
    console.error(`SWR fetch error for ${url}:`, error);
    throw error;
  }
};

// SWR configuration for optimal performance
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 30000, // Refresh every 30 seconds
  dedupingInterval: 2000, // Dedupe requests within 2 seconds
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  loadingTimeout: 10000,
};

// Custom hook for fetching data with SWR
export const useQueries = () => {
  const { data, error, mutate } = useSWR('/api/queries', fetcher, swrConfig);

  return {
    queries: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export const useStats = () => {
  const { data, error, mutate } = useSWR('/api/stats', fetcher, swrConfig);

  return {
    stats: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export const useQueriesWithStats = () => {
  const { data, error, mutate } = useSWR('/api/queries-with-stats', fetcher, swrConfig);

  return {
    queriesWithStats: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};

export const useCVEs = (queryId) => {
  const { data, error, mutate } = useSWR(
    queryId ? `/api/queries/${queryId}/cves` : null,
    fetcher,
    {
      ...swrConfig,
      refreshInterval: 0, // Don't auto-refresh CVEs
    }
  );

  return {
    cves: data || [],
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
};
