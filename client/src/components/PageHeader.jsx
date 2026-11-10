import { Stack, Typography } from '@mui/material';
import { usePageTitle } from '../hooks/usePageTitle.js';

// Заголовок сторінки (h1) з необов'язковою головною дією праворуч; він же – заголовок вкладки
export function PageHeader({ title, action }) {
  usePageTitle(title);
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ mb: 3, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}
    >
      <Typography variant="h4" component="h1" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
        {title}
      </Typography>
      {action}
    </Stack>
  );
}
