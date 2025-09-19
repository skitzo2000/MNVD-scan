import { Box, Typography, Tooltip } from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';

const Header = () => {
  return (
    <Box sx={{ mb: 4, textAlign: 'center' }}>
      <Tooltip title="Monitor National Vulnerability Database for your systems" arrow>
        <Typography variant="h3" component="h1" gutterBottom sx={{ cursor: 'help' }}>
          <SecurityIcon sx={{ mr: 2, fontSize: '2rem' }} />
          MNVD
        </Typography>
      </Tooltip>
    </Box>
  );
};

export default Header;
