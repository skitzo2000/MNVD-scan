import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';

const StatsCards = ({ stats }) => {
  if (!stats) return null;

  return (
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
  );
};

export default StatsCards;
