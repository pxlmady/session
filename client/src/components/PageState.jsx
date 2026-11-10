import { useEffect, useState } from 'react';
import { Alert, Box, Button, Skeleton, Stack, Typography } from '@mui/material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

// Службові стани сторінки (UX, п. 5.3): завантаження, помилка, порожньо.
// Під час завантаження показуються «скелетони» на місці майбутнього списку;
// порожній стан має іконку (за замовчуванням – порожня скринька) і пояснення.
// Повертає null, якщо треба показати дані.

// Скелетони з'являються лише якщо завантаження триває довше за SKELETON_DELAY_MS:
// швидкі відповіді (локальний сервер) не дають короткого «миготіння» сірих блоків
const SKELETON_DELAY_MS = 300;

function DelayedSkeleton({ rows }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), SKELETON_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);
  return (
    <Stack spacing={1.5} aria-busy="true" aria-label="Завантаження">
      {visible &&
        Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={72} />
        ))}
    </Stack>
  );
}

export function PageState({
  loading,
  error,
  empty,
  emptyText,
  emptyAction,
  emptyIcon: EmptyIcon = InboxOutlinedIcon,
  onRetry,
  skeletonRows = 3,
}) {
  if (loading) return <DelayedSkeleton rows={skeletonRows} />;
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
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: 'text.secondary',
          }}
        >
          <EmptyIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography color="text.secondary">{emptyText}</Typography>
        {emptyAction}
      </Stack>
    );
  }
  return null;
}
