import { Box, Stack, Typography } from '@mui/material';

// Знак Session: літера «S» на ірисовому квадраті з акцентною крапкою кольору календули
// (той самий малюнок, що й favicon.svg). Вбудований SVG – без окремого запиту до сервера.
export function BrandMark({ size = 36 }) {
  return (
    <Box
      component="svg"
      viewBox="0 0 64 64"
      aria-hidden="true"
      sx={{ width: size, height: size, flexShrink: 0, display: 'block' }}
    >
      <defs>
        <linearGradient id="session-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5B57E8" />
          <stop offset="1" stopColor="#2F2CA6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#session-mark)" />
      <path
        d="M41.5 21.5c-2.2-2.6-5.6-4-9.6-4-6 0-10.2 3.2-10.2 7.9 0 4.4 3.2 6.4 9.4 7.7 4.6 1 6.4 2 6.4 4.1 0 2.3-2.4 3.8-6 3.8-3.4 0-6.4-1.4-8.6-3.9"
        fill="none"
        stroke="#fff"
        strokeWidth="5.5"
        strokeLinecap="round"
      />
      <circle cx="46" cy="46" r="5" fill="#F2C45C" />
    </Box>
  );
}

// Знак із назвою та підписом сервісу
export function BrandLogo({ size = 36, caption = 'консультації з викладачами' }) {
  return (
    <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', minWidth: 0 }}>
      <BrandMark size={size} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontWeight: 800,
            fontSize: '1.15rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.1,
          }}
        >
          Session
        </Typography>
        {caption && (
          <Typography
            component="span"
            noWrap
            sx={{ display: 'block', fontSize: '0.72rem', opacity: 0.7, lineHeight: 1.3 }}
          >
            {caption}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
