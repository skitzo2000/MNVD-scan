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
    cpe_id: '',
    name: '',
    description: ''
  });

  const handleClose = () => {
    setNewQuery({ cpe_id: '', name: '', description: '' });
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
          helperText="Common Platform Enumeration (CPE) identifier"
          sx={{ mb: 2 }}
        />
        <Alert severity="info" sx={{ mb: 2 }}>
          All notifications will be sent to the configured Discord webhook.
        </Alert>
        <TextField
          margin="dense"
          label="Query Name (Optional)"
          fullWidth
          variant="outlined"
          value={newQuery.name}
          onChange={(e) => setNewQuery({ ...newQuery, name: e.target.value })}
          placeholder="Windows 10 Vulnerabilities"
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          label="Description (Optional)"
          fullWidth
          variant="outlined"
          multiline
          rows={3}
          value={newQuery.description}
          onChange={(e) => setNewQuery({ ...newQuery, description: e.target.value })}
          placeholder="Monitoring Windows 10 for security vulnerabilities"
        />
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
