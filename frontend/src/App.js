import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Grid,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  CardActions,
  Chip,
  Alert,
  Snackbar,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  PlayArrow as ScanIcon,
  Security as SecurityIcon,
  BugReport as BugIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon
} from '@mui/icons-material';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' ? '' : '';
const APP_VERSION = '1.0.0'; // This should match package.json version

function App() {
  const [queries, setQueries] = useState([]);
  const [queriesWithStats, setQueriesWithStats] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCVEDialog, setOpenCVEDialog] = useState(false);
  const [selectedQuery, setSelectedQuery] = useState(null);
  const [selectedQueryCVEs, setSelectedQueryCVEs] = useState([]);
  const [cveLoading, setCveLoading] = useState(false);
  const [deletingQuery, setDeletingQuery] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('nvd-scanner-view-mode') || 'cards';
  });
  const [newQuery, setNewQuery] = useState({
    cpe_id: '',
    name: '',
    description: ''
  });

  // Load queries and stats on component mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [queriesResponse, statsResponse, queriesWithStatsResponse] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/queries`),
        axios.get(`${API_BASE_URL}/api/stats`),
        axios.get(`${API_BASE_URL}/api/queries-with-stats`)
      ]);

      setQueries(Array.isArray(queriesResponse.data) ? queriesResponse.data : []);
      setStats(statsResponse.data);
      setQueriesWithStats(Array.isArray(queriesWithStatsResponse.data) ? queriesWithStatsResponse.data : []);
    } catch (error) {
      console.error('Error loading data:', error);
      showSnackbar('Failed to load data', 'error');
      // Ensure arrays are set even on error
      setQueriesWithStats([]);
      setQueries([]);
    } finally {
      setLoading(false);
    }
  };

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
    setNewQuery({ cpe_id: '', name: '', description: '' });
  };

  const handleCreateQuery = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/queries`, newQuery);
      setQueries([...queries, response.data]);
      handleCloseDialog();
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
      await axios.delete(`${API_BASE_URL}/api/queries/${id}`);
      // Update both state arrays
      setQueries(queries.filter(q => q.id !== id));
      setQueriesWithStats(queriesWithStats.filter(q => q.id !== id));
      showSnackbar('Query deleted successfully');
      // Refresh data to ensure consistency
      loadData();
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
      const response = await axios.post(`${API_BASE_URL}/api/scan`);
      const result = response.data;
      
      if (result.queriesProcessed === 0) {
        showSnackbar('No queries found to scan. Add some CPE queries first.', 'warning');
      } else {
        showSnackbar(`Scan completed! Processed ${result.queriesProcessed} queries.`, 'success');
      }
      
      loadData(); // Refresh stats
    } catch (error) {
      console.error('Error running scan:', error);
      const errorMessage = error.response?.data?.details || error.message || 'Unknown error';
      showSnackbar(`Scan failed: ${errorMessage}`, 'error');
    } finally {
      setScanning(false);
    }
  };

  const handleCardClick = async (query) => {
    try {
      setCveLoading(true);
      setSelectedQuery(query);
      setOpenCVEDialog(true);
      
      const response = await axios.get(`${API_BASE_URL}/api/queries/${query.id}/cves`);
      setSelectedQueryCVEs(response.data);
    } catch (error) {
      console.error('Error fetching CVEs:', error);
      showSnackbar('Failed to load CVEs for this query', 'error');
    } finally {
      setCveLoading(false);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getSeverityTextColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high': return '#d32f2f'; // Red for critical/high
      case 'medium': return '#f57c00'; // Orange for medium  
      case 'low': return '#1976d2'; // Blue for low
      default: return '#666';
    }
  };

  const getCardSeverityStyle = (query) => {
    if (query.critical_high_count > 0) {
      return { borderLeft: '4px solid #d32f2f', backgroundColor: '#ffebee' };
    } else if (query.medium_count > 0) {
      return { borderLeft: '4px solid #f57c00', backgroundColor: '#fff3e0' };
    } else if (query.low_count > 0) {
      return { borderLeft: '4px solid #1976d2', backgroundColor: '#e3f2fd' };
    }
    return {};
  };

  const handleCloseCVEDialog = () => {
    setOpenCVEDialog(false);
    setSelectedQuery(null);
    setSelectedQueryCVEs([]);
    setCveLoading(false);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Tooltip title="Monitor National Vulnerability Database for your systems" arrow>
            <Typography variant="h3" component="h1" gutterBottom sx={{ cursor: 'help' }}>
              <SecurityIcon sx={{ mr: 2, fontSize: '2rem' }} />
              MNVD
            </Typography>
          </Tooltip>
        </Box>

      {/* Stats Cards */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.totalQueries}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Queries
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="h4" color="secondary">
                {stats.processedCVEs}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Processed CVEs
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Header with Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Vulnerability Queries
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(event, newViewMode) => {
              if (newViewMode !== null && (newViewMode === 'cards' || newViewMode === 'list')) {
                setViewMode(newViewMode);
                localStorage.setItem('nvd-scanner-view-mode', newViewMode);
              }
            }}
            aria-label="view mode"
            size="small"
          >
            <ToggleButton value="cards" aria-label="card view">
              <Tooltip title="Card View">
                <CardViewIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="list" aria-label="list view">
              <Tooltip title="List View">
                <ListViewIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="" aria-label="reload" onClick={loadData}>
              <Tooltip title="Reload">
                <RefreshIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="" aria-label="add query" onClick={handleOpenDialog}>
              <Tooltip title="Add Query">
                <AddIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="" aria-label="run scan" onClick={handleManualScan} disabled={scanning}>
              <Tooltip title={scanning ? 'Scanning...' : 'Run Scan'}>
                {scanning ? <CircularProgress size={20} /> : <ScanIcon />}
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Queries List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : !Array.isArray(queriesWithStats) || queriesWithStats.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <BugIcon sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No queries configured
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add your first vulnerability query to start monitoring
          </Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenDialog}>
            Create First Query
          </Button>
        </Paper>
      ) : viewMode === 'cards' ? (
        <Grid container spacing={3}>
          {(queriesWithStats || []).map((query) => (
            <Grid item xs={12} md={6} lg={4} key={query.id}>
              <Card 
                elevation={2} 
                sx={{ 
                  ...getCardSeverityStyle(query),
                  cursor: 'pointer',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: 4
                  }
                }}
                onClick={() => handleCardClick(query)}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {query.name || `Query ${query.id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {query.description || 'No description'}
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                      {query.cpe_id}
                    </Typography>
                  </Box>
                  
                  {/* CVE Statistics */}
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      CVE Statistics:
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {query.critical_high_count > 0 && (
                        <Chip 
                          label={`${query.critical_high_count} Critical/High`}
                          size="small"
                          sx={{ 
                            color: getSeverityTextColor('high'),
                            backgroundColor: '#ffebee',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                      {query.medium_count > 0 && (
                        <Chip 
                          label={`${query.medium_count} Medium`}
                          size="small"
                          sx={{ 
                            color: getSeverityTextColor('medium'),
                            backgroundColor: '#fff3e0',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                      {query.low_count > 0 && (
                        <Chip 
                          label={`${query.low_count} Low`}
                          size="small"
                          sx={{ 
                            color: getSeverityTextColor('low'),
                            backgroundColor: '#e3f2fd',
                            fontWeight: 'bold'
                          }}
                        />
                      )}
                      {query.total_cves === 0 && (
                        <Chip 
                          label="No CVEs"
                          size="small"
                          color="default"
                        />
                      )}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Total: {query.total_cves} CVE{query.total_cves !== 1 ? 's' : ''}
                    </Typography>
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Created: {new Date(query.created_at).toLocaleDateString()}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Tooltip title="View CVE Details">
                    <Button 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardClick(query);
                      }}
                    >
                      View Details
                    </Button>
                  </Tooltip>
                  <Tooltip title="Delete Query">
                    <IconButton
                      color="error"
                      disabled={deletingQuery === query.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuery(query.id);
                      }}
                    >
                      {deletingQuery === query.id ? <CircularProgress size={20} /> : <DeleteIcon />}
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Query</TableCell>
                <TableCell>CPE ID</TableCell>
                <TableCell align="center">Critical/High</TableCell>
                <TableCell align="center">Medium</TableCell>
                <TableCell align="center">Low</TableCell>
                <TableCell align="center">Total CVEs</TableCell>
                <TableCell align="center">Created</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(queriesWithStats || []).map((query) => (
                <TableRow 
                  key={query.id}
                  sx={{
                    ...getCardSeverityStyle(query),
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                  onClick={() => handleCardClick(query)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                        {query.name || `Query ${query.id}`}
                      </Typography>
                      {query.description && (
                        <Typography variant="body2" color="text.secondary">
                          {query.description}
                        </Typography>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                      {query.cpe_id}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {query.critical_high_count > 0 ? (
                      <Chip 
                        label={query.critical_high_count}
                        size="small"
                        sx={{ 
                          color: getSeverityTextColor('high'),
                          backgroundColor: '#ffebee',
                          fontWeight: 'bold'
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">0</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {query.medium_count > 0 ? (
                      <Chip 
                        label={query.medium_count}
                        size="small"
                        sx={{ 
                          color: getSeverityTextColor('medium'),
                          backgroundColor: '#fff3e0',
                          fontWeight: 'bold'
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">0</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    {query.low_count > 0 ? (
                      <Chip 
                        label={query.low_count}
                        size="small"
                        sx={{ 
                          color: getSeverityTextColor('low'),
                          backgroundColor: '#e3f2fd',
                          fontWeight: 'bold'
                        }}
                      />
                    ) : (
                      <Typography variant="body2" color="text.secondary">0</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {query.total_cves}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="body2">
                      {new Date(query.created_at).toLocaleDateString()}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                      <Tooltip title="View CVE Details">
                        <Button 
                          size="small"
                          variant="outlined"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCardClick(query);
                          }}
                        >
                          Details
                        </Button>
                      </Tooltip>
                      <Tooltip title="Delete Query">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={deletingQuery === query.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteQuery(query.id);
                          }}
                        >
                          {deletingQuery === query.id ? <CircularProgress size={16} /> : <DeleteIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create Query Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Vulnerability Query</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="CPE ID"
            fullWidth
            variant="outlined"
            value={newQuery.cpe_id}
            onChange={(e) => setNewQuery({ ...newQuery, cpe_id: e.target.value })}
            placeholder="cpe:2.3:a:microsoft:windows_10:*:*:*:*:*:*:*"
            helperText="Common Platform Enumeration (CPE) identifier"
            sx={{ mb: 2 }}
          />
          <Alert severity="info" sx={{ mb: 2 }}>
            All notifications will be sent to the configured Discord webhook.
          </Alert>
          <TextField
            margin="dense"
            label="Query Name (Optional)"
            fullWidth
            variant="outlined"
            value={newQuery.name}
            onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
            placeholder="Windows 10 Vulnerabilities"
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newQuery.description}
            onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
            placeholder="Monitoring Windows 10 for security vulnerabilities"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleCreateQuery}
            variant="contained"
            disabled={!newQuery.cpe_id}
          >
            Create Query
          </Button>
        </DialogActions>
      </Dialog>

      {/* CVE Details Dialog */}
      <Dialog open={openCVEDialog} onClose={handleCloseCVEDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          CVE Details for {selectedQuery?.name || `Query ${selectedQuery?.id}`}
        </DialogTitle>
        <DialogContent>
          {cveLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : selectedQueryCVEs.length === 0 ? (
            <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
              No CVEs found for this query.
            </Typography>
          ) : (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 2 }}>
                Found {selectedQueryCVEs.length} CVE{selectedQueryCVEs.length !== 1 ? 's' : ''}:
              </Typography>
              <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
                {selectedQueryCVEs.map((cve, index) => (
                  <Paper key={cve.cve_id} elevation={1} sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography 
                        variant="h6" 
                        component="a"
                        href={cve.nvd_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{ 
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {cve.cve_id}
                      </Typography>
                      <Chip 
                        label={cve.severity}
                        size="small"
                        color={getSeverityColor(cve.severity)}
                        sx={{ ml: 2 }}
                      />
                      {cve.cvss_score && (
                        <Typography variant="body2" sx={{ ml: 2 }}>
                          CVSS: {cve.cvss_score}
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {cve.description}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Processed: {new Date(cve.processed_at).toLocaleString()}
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCVEDialog}>Close</Button>
        </DialogActions>
      </Dialog>

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

      </Container>

      {/* Footer positioned at bottom of page */}
      <Box sx={{ 
        borderTop: '1px solid', 
        borderColor: 'divider', 
        py: 2, 
        px: 3,
        backgroundColor: 'background.paper',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 2
      }}>
        {/* Left: NVD Attribution */}
        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
          NVD Attribution: This product uses the NVD API but is not endorsed or certified by the NVD.
        </Typography>
        
        {/* Center: Copyright */}
        <Typography variant="caption" color="text.secondary">
          © 2025
        </Typography>
        
        {/* Right: Version */}
        <Typography 
          variant="caption" 
          color="primary" 
          sx={{ 
            cursor: 'pointer',
            textDecoration: 'underline',
            '&:hover': { textDecoration: 'none' }
          }}
          onClick={() => {
            alert(`MNVD - Monitor National Vulnerability Database

Purpose: Uses the NVD to track specific vulnerabilities and send webhook notifications.

GitHub Repository: Coming Soon
(Repository will be created and linked here)`)
          }}
        >
          Version: {APP_VERSION}
        </Typography>
      </Box>
    </Box>
  );
}

export default App;
