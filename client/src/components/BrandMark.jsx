import { useId } from 'react';
import { Box, Stack, Typography } from '@mui/material';

// Контур літери «S» шрифту Inter (накреслення 700), вписаний у квадрат 56 × 56 так само,
// як текст по центру квадрата (кегль – половина сторони). Той самий контур – у favicon.svg,
// тому знак однаковий на сторінці й у вкладці браузера та не залежить від завантаження шрифту.
const S_PATH =
  'M28.15 38.48Q25.7 38.48 23.89 37.73Q22.08 36.98 21.07 35.5Q20.05 34.03 19.99 31.86H24.05Q24.13 32.89 24.67 33.58Q25.2 34.27 26.09 34.62Q26.98 34.96 28.1 34.96Q29.22 34.96 30.05 34.64Q30.88 34.31 31.34 33.72Q31.8 33.13 31.8 32.36Q31.8 31.66 31.39 31.19Q30.98 30.72 30.19 30.38Q29.41 30.04 28.3 29.78L26.06 29.22Q23.47 28.59 22 27.25Q20.54 25.9 20.54 23.68Q20.54 21.83 21.53 20.45Q22.53 19.07 24.26 18.31Q25.99 17.54 28.2 17.54Q30.46 17.54 32.14 18.31Q33.82 19.09 34.76 20.46Q35.7 21.83 35.74 23.62H31.7Q31.58 22.4 30.65 21.72Q29.72 21.05 28.16 21.05Q27.1 21.05 26.35 21.35Q25.6 21.66 25.21 22.19Q24.81 22.73 24.81 23.41Q24.81 24.16 25.27 24.66Q25.73 25.15 26.47 25.46Q27.22 25.77 28.08 25.98L29.91 26.43Q31.2 26.72 32.31 27.21Q33.42 27.71 34.25 28.42Q35.08 29.14 35.55 30.12Q36.01 31.1 36.01 32.38Q36.01 34.24 35.07 35.61Q34.14 36.98 32.38 37.73Q30.62 38.48 28.15 38.48Z';

// Знак Session: літера «S» на квадраті кольору тексту (графітовому у світлій схемі,
// «сніжному» в темній) і крапка акцентного кольору на правому нижньому куті. Навколо крапки
// квадрат вирізано кільцем, тому під крапкою видно тло, на якому стоїть знак. У темній схемі
// крапка ледь світиться. Пропорції знака (сторона 30 px, крапка 8 px, кільце 2 px) – як у макеті.
// inverse – світлий знак для темної панелі сторінок входу й реєстрації
export function BrandMark({ size = 30, inverse = false }) {
  const maskId = `brand-mark-${useId().replace(/[^\w-]/g, '')}`;
  // Масштаб відносно сторони 30 px з макета
  const k = size / 30;
  return (
    <Box aria-hidden="true" sx={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Box
        component="svg"
        viewBox="0 0 56 56"
        sx={(theme) => ({
          display: 'block',
          width: size,
          height: size,
          '& .mark-bg': {
            fill: inverse ? theme.vars.palette.hero.text : theme.vars.palette.text.primary,
          },
          '& .mark-s': {
            fill: inverse
              ? theme.vars.palette.hero.markText
              : theme.vars.palette.background.default,
          },
        })}
      >
        <mask id={maskId}>
          <rect width="56" height="56" fill="#fff" />
          <circle cx="50.4" cy="50.4" r="11.2" fill="#000" />
        </mask>
        <rect className="mark-bg" width="56" height="56" rx="16.8" mask={`url(#${maskId})`} />
        <path className="mark-s" d={S_PATH} />
      </Box>
      <Box
        sx={(theme) => ({
          position: 'absolute',
          right: -3 * k,
          bottom: -3 * k,
          boxSizing: 'border-box',
          width: 12 * k,
          height: 12 * k,
          // Прозора рамка шириною з кільце: світіння починається від краю вирізу,
          // а саме кільце лишається кольору тла, як у макеті
          border: `${2 * k}px solid transparent`,
          backgroundClip: 'padding-box',
          borderRadius: '50%',
          bgcolor: inverse ? theme.vars.palette.hero.accent : theme.vars.palette.primary.main,
          boxShadow: inverse
            ? '0 0 10px 1px rgba(136 192 208 / 0.7)'
            : `${theme.vars.palette.glow.dot} ${theme.vars.palette.primary.main}`,
        })}
      />
    </Box>
  );
}

// Знак із назвою та підписом сервісу. Кегль назви – половина сторони знака (15 px у бічній
// панелі, 16 px на сторінці входу), підпис – 12 px приглушеного кольору.
export function BrandLogo({ size = 30, caption = 'консультації з викладачами', inverse = false }) {
  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', minWidth: 0 }}>
      <BrandMark size={size} inverse={inverse} />
      <Box sx={{ minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            display: 'block',
            fontWeight: 600,
            fontSize: `${size / 2}px`,
            letterSpacing: '-0.01em',
            lineHeight: 1.5,
          }}
        >
          Session
        </Typography>
        {caption && (
          <Typography
            component="span"
            noWrap
            sx={(theme) => ({
              display: 'block',
              fontSize: '0.75rem',
              lineHeight: 1.5,
              color: inverse ? theme.vars.palette.hero.muted : theme.vars.palette.sidebar.caption,
            })}
          >
            {caption}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
