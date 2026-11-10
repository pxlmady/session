import { Box, Card, CardContent, Typography } from '@mui/material';
import { ThemeModeToggle } from '../components/ThemeModeToggle.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

// Картка форми входу або реєстрації по центру екрана
export function AuthCard({ title, maxWidth = 400, children }) {
  usePageTitle(title);
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        position: 'relative',
        px: 2,
        py: 4,
      }}
    >
      <ThemeModeToggle sx={{ position: 'absolute', top: 12, right: 12 }} />
      <Card sx={{ width: '100%', maxWidth }}>
        <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
          <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
            {title}
          </Typography>
          {children}
        </CardContent>
      </Card>
    </Box>
  );
}
