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
import { getSeverityTextColor, getCardSeverityStyle } from '../../lib/severityColors';

/**
 * @param {Object} props
 * @param {Array<{ id: string, cpe_id: string, name?: string, description?: string, createdAt: string, totalCves: number, criticalHighCount: number, mediumCount: number, lowCount: number }>} props.queries
 * @param {Function} props.onCardClick
 * @param {Function} props.onDelete
 * @param {string} [props.deletingQuery]
 */
const QueryList = ({
  queries,
  onCardClick,
  onDelete,
  deletingQuery
}) => {

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
                {query.criticalHighCount > 0 ? (
                  <Chip 
                    label={query.criticalHighCount}
                    size="small"
                    sx={{ 
                      color: getSeverityTextColor('high'),
                      backgroundColor: '#ffebee',
                      fontWeight: 'bold'
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell align="center">
                {query.mediumCount > 0 ? (
                  <Chip 
                    label={query.mediumCount}
                    size="small"
                    sx={{ 
                      color: getSeverityTextColor('medium'),
                      backgroundColor: '#fff3e0',
                      fontWeight: 'bold'
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell align="center">
                {query.lowCount > 0 ? (
                  <Chip 
                    label={query.lowCount}
                    size="small"
                    sx={{ 
                      color: getSeverityTextColor('low'),
                      backgroundColor: '#e3f2fd',
                      fontWeight: 'bold'
                    }}
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">-</Typography>
                )}
              </TableCell>
              <TableCell align="center">
                <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                  {query.totalCves}
                </Typography>
              </TableCell>
              <TableCell align="center">
                <Typography variant="body2">
                  {new Date(query.createdAt).toLocaleDateString()}
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
