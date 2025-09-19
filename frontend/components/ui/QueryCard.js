import React from 'react';
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
