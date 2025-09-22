import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert
} from '@mui/material';

const QueryForm = ({ open, onClose, onSubmit }) => {
  const [newQuery, setNewQuery] = useState({
    cpe_id: ''
  });

  const handleClose = () => {
    setNewQuery({ cpe_id: '' });
    onClose();
  };

  const handleSubmit = () => {
    onSubmit(newQuery);
    handleClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableScrollLock={true}
    >
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
          helperText="Common Platform Enumeration (CPE) identifier - Name and description will be auto-generated"
          sx={{ mb: 2 }}
        />
        <Alert severity="info" sx={{ mb: 2 }}>
          All notifications will be sent to the configured Discord webhook.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!newQuery.cpe_id}
        >
          Create Query
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QueryForm;
