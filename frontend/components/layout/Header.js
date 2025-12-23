import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { Security as SecurityIcon, Settings as SettingsIcon } from '@mui/icons-material';

const Header = ({ onSettingsClick }) => {
  return (
    <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
      <Tooltip title="Settings" arrow>
        <IconButton 
          onClick={onSettingsClick}
          sx={{ position: 'absolute', left: 0 }}
          aria-label="settings"
        >
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      
      <Tooltip title="Monitor National Vulnerability Database for your systems" arrow>
        <Typography variant="h3" component="h1" gutterBottom sx={{ cursor: 'help', mb: 0 }}>
          <SecurityIcon sx={{ mr: 2, fontSize: '2rem' }} />
          MNVD
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default Header;
