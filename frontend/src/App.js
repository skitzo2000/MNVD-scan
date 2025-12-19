import { useState } from 'react';
import { Box, Grid, Snackbar, Alert, CircularProgress } from '@mui/material';
import axios from 'axios';

// Import components
import Layout from '../components/layout/Layout';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import StatsCards from '../components/ui/StatsCards';
import ActionToolbar from '../components/ui/ActionToolbar';
import QueryCard from '../components/ui/QueryCard';
import QueryList from '../components/ui/QueryList';
import EmptyState from '../components/ui/EmptyState';
import QueryForm from '../components/forms/QueryForm';
import CVEDetailsDialog from '../components/ui/CVEDetailsDialog';
import PerformanceMonitor from '../components/ui/PerformanceMonitor';

// Import custom hooks
import { useQueries, useStats, useQueriesWithStats, useCVEs } from '../components/hooks/useData';

function App() {
  // Use SWR hooks for data fetching with caching and performance optimization
  const { isLoading: queriesLoading, mutate: mutateQueries } = useQueries();
  const { stats, isLoading: statsLoading } = useStats();
  const { queriesWithStats, isLoading: queriesWithStatsLoading, mutate: mutateQueriesWithStats } = useQueriesWithStats();
  
  const [openDialog, setOpenDialog] = useState(false);
  const [openCVEDialog, setOpenCVEDialog] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [deletingQuery, setDeletingQuery] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window !== 'undefined') {
      // Migrate from old key to new key
      const oldKey = 'nvd-scanner-view-mode';
      const newKey = 'mnvd-scanner-view-mode';
      const newValue = localStorage.getItem(newKey);
      
      if (!newValue) {
        const oldValue = localStorage.getItem(oldKey);
        if (oldValue) {
          localStorage.setItem(newKey, oldValue);
          localStorage.removeItem(oldKey);
          return oldValue;
        }
      }
      
      return newValue || 'cards';
    }
    return 'cards';
  });

  // Use SWR for CVE data when a query is selected
  const { cves: selectedQueryCVEs, isLoading: cveLoading } = useCVEs(selectedQuery?.id);

  // Combined loading state
  const loading = queriesLoading || statsLoading || queriesWithStatsLoading;

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleCreateQuery = async (newQuery) => {
    try {
      await axios.post('/api/queries', newQuery);
      // Optimistically update the cache
      mutateQueries();
      mutateQueriesWithStats();
      showSnackbar('Query created successfully');
    } catch (error) {
      console.error('Error creating query:', error);
      showSnackbar('Failed to create query', 'error');
    }
  };

  const handleDeleteQuery = async (id) => {
    if (deletingQuery === id) return; // Prevent double-clicks
    
    try {
      setDeletingQuery(id);
      await axios.delete(`/api/queries/${id}`);
      // Optimistically update the cache
      mutateQueries();
      mutateQueriesWithStats();
      showSnackbar('Query deleted successfully');
    } catch (error) {
      console.error('Error deleting query:', error);
      showSnackbar('Failed to delete query', 'error');
    } finally {
      setDeletingQuery(null);
    }
  };

  const handleManualScan = async () => {
    try {
      setScanning(true);
      const response = await axios.post('/api/scan');
      const result = response.data;
      
      if (result.queriesProcessed === 0) {
        showSnackbar('No queries found to scan. Add some CPE queries first.', 'warning');
      } else {
        showSnackbar(`Scan completed! Processed ${result.queriesProcessed} queries.`, 'success');
      }
      
      // Refresh all data after scan
      mutateQueries();
      mutateQueriesWithStats();
    } catch (error) {
      console.error('Error running scan:', error);
      const errorMessage = error.response?.data?.details || error.message || 'Unknown error';
      showSnackbar(`Scan failed: ${errorMessage}`, 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleCardClick = (query) => {
    setSelectedQuery(query);
    setOpenCVEDialog(true);
    // SWR will automatically fetch CVEs when selectedQuery.id changes
  };

  const handleCloseCVEDialog = () => {
    setOpenCVEDialog(false);
    setSelectedQuery(null);
  };

  const handleViewModeChange = (newViewMode) => {
    setViewMode(newViewMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mnvd-scanner-view-mode', newViewMode);
    }
  };

  // Refresh function for manual refresh
  const handleRefresh = () => {
    mutateQueries();
    mutateQueriesWithStats();
  };

  return (
    <Layout>
      <PerformanceMonitor />
      <Header />
      
      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Action Toolbar */}
      <ActionToolbar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onRefresh={handleRefresh}
        onAddQuery={handleOpenDialog}
        onScan={handleManualScan}
        scanning={scanning}
      />

      {/* Queries List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : !Array.isArray(queriesWithStats) || queriesWithStats.length === 0 ? (
        <EmptyState onAddQuery={handleOpenDialog} />
      ) : viewMode === 'cards' ? (
        <Grid container spacing={3}>
          {(queriesWithStats || []).map((query) => (
            <Grid item xs={12} sm={4} key={query.id} sx={{ display: 'flex' }}>
              <QueryCard
                query={query}
                onCardClick={handleCardClick}
                onDelete={handleDeleteQuery}
                deletingQuery={deletingQuery}
              />
            </Grid>
          ))}
        </Grid>
      ) : (
        <QueryList
          queries={queriesWithStats || []}
          onCardClick={handleCardClick}
          onDelete={handleDeleteQuery}
          deletingQuery={deletingQuery}
        />
      )}

      {/* Create Query Dialog */}
      <QueryForm
        open={openDialog}
        onClose={handleCloseDialog}
        onSubmit={handleCreateQuery}
      />

      {/* CVE Details Dialog */}
      <CVEDetailsDialog
        open={openCVEDialog}
        onClose={handleCloseCVEDialog}
        selectedQuery={selectedQuery}
        cves={selectedQueryCVEs}
        loading={cveLoading}
      />

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Footer />
    </Layout>
  );
}

export default App;
