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
  CircularProgress,
  InputAdornment,
  IconButton,
  Chip
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
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
  const [showApiKey, setShowApiKey] = useState(false);
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
    setShowApiKey(false);
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

  const toggleShowApiKey = () => {
    setShowApiKey(!showApiKey);
  };

  const getSourceChip = (source) => {
    if (source === 'environment') {
      return <Chip label="From Environment" size="small" color="primary" sx={{ ml: 1 }} />;
    } else if (source === 'database') {
      return <Chip label="From Database" size="small" color="secondary" sx={{ ml: 1 }} />;
    }
    return null;
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="md" 
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
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Configure your NVD API key and webhook URL. Environment variables will override these settings.
            </Typography>

            {/* NVD API Key */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  NVD API Key (Required)
                </Typography>
                {getSourceChip(effectiveSource.nvdApiKey)}
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                type={showApiKey ? 'text' : 'password'}
                value={settings.nvdApiKey}
                onChange={(e) => setSettings({ ...settings, nvdApiKey: e.target.value })}
                placeholder={apiKeySet ? MASKED_VALUE : 'Enter your NVD API key'}
                helperText="Get your API key from https://nvd.nist.gov/developers/request-an-api-key"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={toggleShowApiKey}
                        edge="end"
                      >
                        {showApiKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>

            {/* Webhook URL */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">
                  Webhook URL (Optional)
                </Typography>
                {getSourceChip(effectiveSource.webhookUrl)}
              </Box>
              <TextField
                fullWidth
                variant="outlined"
                value={settings.webhookUrl}
                onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                placeholder="https://discord.com/api/webhooks/... or Teams webhook"
                helperText="Discord or Microsoft Teams webhook URL for notifications"
              />
            </Box>

            {/* Test Results */}
            {testResults && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Test Results</Typography>
                
                {testResults.nvdApi && (
                  <Alert 
                    severity={testResults.nvdApi.success ? 'success' : 'error'} 
                    icon={testResults.nvdApi.success ? <CheckCircleIcon /> : <ErrorIcon />}
                    sx={{ mb: 1 }}
                  >
                    <strong>NVD API:</strong> {testResults.nvdApi.message}
                  </Alert>
                )}
                
                {testResults.webhook && (
                  <Alert 
                    severity={testResults.webhook.success ? 'success' : 'info'} 
                    icon={testResults.webhook.success ? <CheckCircleIcon /> : <ErrorIcon />}
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
        <Box sx={{ flex: 1 }} />
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
