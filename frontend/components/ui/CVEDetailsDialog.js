import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Paper,
  CircularProgress
} from '@mui/material';

const CVEDetailsDialog = ({ 
  open, 
  onClose, 
  selectedQuery, 
  cves, 
  loading 
}) => {
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      disableScrollLock={true}
    >
      <DialogTitle>
        CVE Details for {selectedQuery?.name || `Query ${selectedQuery?.id}`}
      </DialogTitle>
      <DialogContent>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : cves.length === 0 ? (
          <Typography variant="body1" sx={{ p: 2, textAlign: 'center' }}>
            No CVEs found for this query.
          </Typography>
        ) : (
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Found {cves.length} CVE{cves.length !== 1 ? 's' : ''}:
            </Typography>
            <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
              {cves.map((cve) => (
                <Paper key={cve.cveId} elevation={1} sx={{ p: 2, mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography 
                      variant="h6" 
                      component="a"
                      href={cve.nvdUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        color: 'primary.main',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' }
                      }}
                    >
                      {cve.cveId}
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
                    Processed: {new Date(cve.createdAt).toLocaleString()}
                  </Typography>
                </Paper>
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default CVEDetailsDialog;
