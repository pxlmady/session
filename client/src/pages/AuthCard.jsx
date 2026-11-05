import { Box, Card, CardContent, Typography } from '@mui/material';

// Картка форми входу або реєстрації по центру екрана
export function AuthCard({ title, maxWidth = 400, children }) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'grey.50',
        px: 2,
        py: 4,
      }}
    >
      <Card sx={{ width: '100%', maxWidth }} variant="outlined">
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
