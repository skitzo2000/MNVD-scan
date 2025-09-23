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
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: '1rem', lineHeight: 1.2 }}>
          {query.name || `Query ${query.id}`}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontSize: '0.75rem', lineHeight: 1.3 }}>
          {query.description || 'No description'}
        </Typography>
        <Box sx={{ mb: 1.5 }}>
          <Typography 
            variant="body2" 
            sx={{ 
              fontFamily: 'monospace', 
              fontSize: '0.7rem',
              wordBreak: 'break-all',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              display: 'block',
              lineHeight: 1.2
            }}
            title={query.cpe_id}  // Show full CPE on hover
          >
            {query.cpe_id}
          </Typography>
        </Box>
        
        {/* CVE Statistics */}
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="subtitle2" gutterBottom sx={{ fontSize: '0.75rem', mb: 0.5 }}>
            CVE Statistics:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {query.criticalHighCount > 0 && (
              <Chip 
                label={`${query.criticalHighCount} Critical/High`}
                size="small"
                sx={{ 
                  fontSize: '0.65rem',
                  height: '20px',
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
                  fontSize: '0.65rem',
                  height: '20px',
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
                  fontSize: '0.65rem',
                  height: '20px',
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
                sx={{ fontSize: '0.65rem', height: '20px' }}
              />
            )}
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.65rem' }}>
            Total: {query.totalCves} CVE{query.totalCves !== 1 ? 's' : ''}
          </Typography>
        </Box>

        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem' }}>
          Created: {new Date(query.createdAt).toLocaleDateString()}
        </Typography>
      </CardContent>
      <CardActions sx={{ p: 1, pt: 0 }}>
        <Tooltip title="View CVE Details">
          <Button 
            size="small"
            sx={{ fontSize: '0.7rem', minWidth: 'auto', px: 1 }}
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
            size="small"
            disabled={deletingQuery === query.id}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(query.id);
            }}
          >
            {deletingQuery === query.id ? <CircularProgress size={16} /> : <DeleteIcon fontSize="small" />}
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
};

export default QueryCard;
