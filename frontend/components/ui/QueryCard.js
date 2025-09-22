import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  Button,
  IconButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';

const QueryCard = ({ 
  query, 
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
    if (query.criticalHighCount > 0) {
      return { borderLeft: '4px solid #d32f2f', backgroundColor: '#ffebee' };
    } else if (query.mediumCount > 0) {
      return { borderLeft: '4px solid #f57c00', backgroundColor: '#fff3e0' };
    } else if (query.lowCount > 0) {
      return { borderLeft: '4px solid #1976d2', backgroundColor: '#e3f2fd' };
    }
    return {};
  };

  return (
    <Card 
      elevation={2}
      sx={{ 
        ...getCardSeverityStyle(query),
        cursor: 'pointer',
        width: '100%',
        maxWidth: '100%',
        minWidth: 0,  // Allow flex shrinking
        flexShrink: 1,  // Allow the card to shrink
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
      onClick={() => onCardClick(query)}
    >
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {query.name || `Query ${query.id}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {query.description || 'No description'}
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              wordBreak: 'break-all',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              display: 'block'
            }}
            title={query.cpe_id}  // Show full CPE on hover
          >
            {query.cpe_id}
          </Typography>
        </Box>
        
        {/* CVE Statistics */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            CVE Statistics:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {query.criticalHighCount > 0 && (
              <Chip 
                label={`${query.criticalHighCount} Critical/High`}
                size="small"
                sx={{ 
                  color: getSeverityTextColor('critical'),
                  backgroundColor: '#ffebee',
                  fontWeight: 'bold'
                }}
              />
            )}
            {query.mediumCount > 0 && (
              <Chip 
                label={`${query.mediumCount} Medium`}
                size="small"
                sx={{ 
                  color: getSeverityTextColor('medium'),
                  backgroundColor: '#fff3e0',
                  fontWeight: 'bold'
                }}
              />
            )}
            {query.lowCount > 0 && (
              <Chip 
                label={`${query.lowCount} Low`}
                size="small"
                sx={{ 
                  color: getSeverityTextColor('low'),
                  backgroundColor: '#e3f2fd',
                  fontWeight: 'bold'
                }}
              />
            )}
            {query.totalCves === 0 && (
              <Chip 
                label="No CVEs"
                size="small"
                color="default"
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Total: {query.totalCves} CVE{query.totalCves !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary">
          Created: {new Date(query.createdAt).toLocaleDateString()}
        </Typography>
      </CardContent>
      <CardActions>
        <Tooltip title="View CVE Details">
          <Button 
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onCardClick(query);
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
              onDelete(query.id);
            }}
          >
            {deletingQuery === query.id ? <CircularProgress size={20} /> : <DeleteIcon />}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default QueryCard;
