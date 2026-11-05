import { Link as RouterLink } from 'react-router';
import { Button, Stack, Typography } from '@mui/material';
import { useAuth } from '../context/auth-context.js';
import { roleHome } from '../utils/roles.js';

export default function NotFoundPage() {
  const { user } = useAuth();
  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 8, px: 2 }}>
      <Typography variant="h4" component="h1">
        Сторінку не знайдено
      </Typography>
      <Button variant="contained" component={RouterLink} to={roleHome(user)}>
        На головну
      </Button>
    </Stack>
  );
}
