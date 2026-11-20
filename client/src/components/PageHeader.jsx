import { Box, Stack, Typography } from '@mui/material';
import { usePageTitle } from '../hooks/usePageTitle.js';

// Заголовок сторінки (h1) з необов'язковим підзаголовком і головною дією праворуч;
// він же – заголовок вкладки
export function PageHeader({ title, subtitle, action }) {
  usePageTitle(title);
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{
        mb: 3,
        justifyContent: 'space-between',
        alignItems: { xs: 'stretch', sm: 'flex-end' },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="h4"
          component="h1"
          sx={{ fontSize: { xs: '1.625rem', sm: '1.875rem' } }}
        >
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mt: 0.75 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
  );
}
