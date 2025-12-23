import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
  Box,
  Typography,
  CircularProgress
} from '@mui/material';
import axios from 'axios';

// Constants
const MASKED_VALUE = '********';

const SettingsDialog = ({ open, onClose, onSettingsSaved }) => {
  const [settings, setSettings] = useState({
    nvdApiKey: '',
    webhookUrl: ''
  });
  const [originalSettings, setOriginalSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [saveMessage, setSaveMessage] = useState(null);
  const [apiKeySet, setApiKeySet] = useState(false);
  const [effectiveSource, setEffectiveSource] = useState({});

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/settings');
      const data = response.data;
      
      // Set the masked API key or empty string
      setSettings({
        nvdApiKey: data.nvdApiKey || '',
        webhookUrl: data.webhookUrl || ''
      });
      
      setOriginalSettings({
        nvdApiKey: data.nvdApiKey || '',
        webhookUrl: data.webhookUrl || ''
      });
      
      setApiKeySet(data.nvdApiKeySet);
      setEffectiveSource(data.effectiveSource || {});
    } catch (error) {
      console.error('Error loading settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSettings({ nvdApiKey: '', webhookUrl: '' });
    setTestResults(null);
    setSaveMessage(null);
    onClose();
  };

  const handleSave = async () => {
    setLoading(true);
    setSaveMessage(null);
    
    try {
      const updates = {};
      
      // Only send API key if it's been changed (not the masked value)
      if (settings.nvdApiKey !== originalSettings.nvdApiKey && settings.nvdApiKey !== MASKED_VALUE) {
        updates.nvdApiKey = settings.nvdApiKey;
      }
      
      // Always send webhook URL (can be cleared)
      if (settings.webhookUrl !== originalSettings.webhookUrl) {
        updates.webhookUrl = settings.webhookUrl;
      }
      
      await axios.put('/api/settings', updates);
      
      setSaveMessage({ type: 'success', text: 'Settings saved successfully!' });
      
      // Notify parent component
      if (onSettingsSaved) {
        onSettingsSaved();
      }
      
      // Reload settings immediately after successful save
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults(null);
    
    try {
      const testData = {
        nvdApiKey: settings.nvdApiKey !== MASKED_VALUE ? settings.nvdApiKey : null,
        webhookUrl: settings.webhookUrl || null
      };
      
      const response = await axios.post('/api/settings/test', testData);
      setTestResults(response.data);
    } catch (error) {
      console.error('Error testing settings:', error);
      setTestResults({
        nvdApi: { success: false, message: 'Test failed' },
        webhook: { success: false, message: 'Test failed' }
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      disableScrollLock={true}
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        {loading && !settings.nvdApiKey ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Alert severity="info" sx={{ mb: 2 }}>
              Configure your NVD API key and webhook URL. Environment variables will override these settings.
            </Alert>

            <TextField
              margin="dense"
              label="NVD API Key (Required)"
              fullWidth
              variant="outlined"
              type="password"
              value={settings.nvdApiKey}
              onChange={(e) => setSettings({ ...settings, nvdApiKey: e.target.value })}
              placeholder={apiKeySet ? MASKED_VALUE : 'Enter your NVD API key'}
              helperText={`Get your API key from https://nvd.nist.gov/developers/request-an-api-key${effectiveSource.nvdApiKey === 'environment' ? ' (Currently using environment variable)' : ''}`}
              sx={{ mb: 2 }}
            />

            <TextField
              margin="dense"
              label="Webhook URL (Optional)"
              fullWidth
              variant="outlined"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/... or Teams webhook"
              helperText={`Discord or Microsoft Teams webhook URL for notifications${effectiveSource.webhookUrl === 'environment' ? ' (Currently using environment variable)' : ''}`}
              sx={{ mb: 2 }}
            />

            {/* Test Results */}
            {testResults && (
              <Box sx={{ mb: 2 }}>
                {testResults.nvdApi && (
                  <Alert 
                    severity={testResults.nvdApi.success ? 'success' : 'error'} 
                    sx={{ mb: 1 }}
                  >
                    <strong>NVD API:</strong> {testResults.nvdApi.message}
                  </Alert>
                )}
                
                {testResults.webhook && (
                  <Alert 
                    severity={testResults.webhook.success ? 'success' : 'info'}
                  >
                    <strong>Webhook:</strong> {testResults.webhook.message}
                  </Alert>
                )}
              </Box>
            )}

            {/* Save Message */}
            {saveMessage && (
              <Alert severity={saveMessage.type} sx={{ mb: 2 }}>
                {saveMessage.text}
              </Alert>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleTest} disabled={loading || testing}>
          {testing ? <CircularProgress size={20} /> : 'Test Connection'}
        </Button>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={loading}
        >
          {loading ? <CircularProgress size={20} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
