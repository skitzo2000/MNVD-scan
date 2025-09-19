import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const QueryList = ({ 
  queries, 
  onCardClick, 
  onDelete, 
  deletingQuery 
}) => {
  const getSeverityTextColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high': return '#d32f2f';
      case 'medium': return '#f57c00';
      case 'low': return '#1976d2';
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

  return (
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
          {queries.map((query) => (
            <TableRow 
              key={query.id}
              sx={{
                ...getCardSeverityStyle(query),
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
              onClick={() => onCardClick(query)}
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
                        onCardClick(query);
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
                        onDelete(query.id);
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
  );
};

export default QueryList;
