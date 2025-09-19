import React from 'react';
import { Box, Typography } from '@mui/material';

const APP_VERSION = '1.0.0';

const Footer = () => {
  return (
    <Box sx={{ 
      borderTop: '1px solid', 
      borderColor: 'divider', 
      py: 2, 
      px: 3,
      backgroundColor: 'background.paper',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: 2
    }}>
      {/* Left: NVD Attribution */}
      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
        NVD Attribution: This product uses the NVD API but is not endorsed or certified by the NVD.
      </Typography>
      
      {/* Center: Copyright */}
      <Typography variant="caption" color="text.secondary">
        © 2025
      </Typography>
      
      {/* Right: Version */}
      <Typography 
        variant="caption" 
        color="primary" 
        sx={{ 
          cursor: 'pointer',
          textDecoration: 'underline',
          '&:hover': { textDecoration: 'none' }
        }}
        onClick={() => {
          alert(`MNVD - Monitor National Vulnerability Database

Purpose: Uses the NVD to track specific vulnerabilities and send webhook notifications.

GitHub Repository: Coming Soon
(Repository will be created and linked here)`);
        }}
      >
        Version: {APP_VERSION}
      </Typography>
    </Box>
  );
};

export default Footer;
