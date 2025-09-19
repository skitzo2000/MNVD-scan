import React from 'react';
import {
  Paper,
  Typography,
  Button,
  Box
} from '@mui/material';
import {
  Add as AddIcon,
  BugReport as BugIcon
} from '@mui/icons-material';

const EmptyState = ({ onAddQuery }) => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <BugIcon sx={{ fontSize: '4rem', color: 'text.secondary', mb: 2 }} />
      <Typography variant="h6" color="text.secondary">
        No queries configured
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add your first vulnerability query to start monitoring
      </Typography>
      <Button variant="contained" startIcon={<AddIcon />} onClick={onAddQuery}>
        Create First Query
      </Button>
    </Paper>
  );
};

export default EmptyState;
