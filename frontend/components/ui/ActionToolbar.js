import React from 'react';
import {
  Box,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  PlayArrow as ScanIcon,
  ViewModule as CardViewIcon,
  ViewList as ListViewIcon
} from '@mui/icons-material';

const ActionToolbar = ({ 
  viewMode, 
  onViewModeChange, 
  onRefresh, 
  onAddQuery, 
  onScan, 
  scanning 
}) => {
  return (
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
              onViewModeChange(newViewMode);
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
          <ToggleButton value="" aria-label="reload" onClick={onRefresh}>
            <Tooltip title="Reload">
              <RefreshIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="" aria-label="add query" onClick={onAddQuery}>
            <Tooltip title="Add Query">
              <AddIcon />
            </Tooltip>
          </ToggleButton>
          <ToggleButton value="" aria-label="run scan" onClick={onScan} disabled={scanning}>
            <Tooltip title={scanning ? 'Scanning...' : 'Run Scan'}>
              {scanning ? <CircularProgress size={20} /> : <ScanIcon />}
            </Tooltip>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>
    </Box>
  );
};

export default ActionToolbar;
