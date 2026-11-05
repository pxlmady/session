import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';

// Службові стани сторінки (UX, п. 5.3): завантаження, помилка, порожньо.
// Повертає null, якщо треба показати дані.
export function PageState({ loading, error, empty, emptyText, emptyAction, onRetry }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }} aria-busy="true">
        <CircularProgress aria-label="Завантаження" />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert
        severity="error"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry}>
              Спробувати ще раз
            </Button>
          ) : undefined
        }
      >
        {error.message}
      </Alert>
    );
  }
  if (empty) {
    return (
      <Stack spacing={2} sx={{ alignItems: 'center', py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">{emptyText}</Typography>
        {emptyAction}
      </Stack>
    );
  }
  return null;
}
