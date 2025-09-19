import { Box, Container } from '@mui/material';

const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
        {children}
      </Container>
    </Box>
  );
};

export default Layout;
