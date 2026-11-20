import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import { BrandLogo } from '../components/BrandMark.jsx';
import { ThemeModeToggle } from '../components/ThemeModeToggle.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

const FEATURES = [
  'Вільний час викладачів в одному місці',
  'Розклад, оцінки й заборгованості поруч із записом',
  'Статус запису й нагадування про консультацію',
];

// Декоративні концентричні кола в куті панелі сервісу
function Rings() {
  return (
    <Box
      component="svg"
      viewBox="0 0 620 620"
      aria-hidden="true"
      sx={(theme) => ({
        position: 'absolute',
        right: -250,
        bottom: -190,
        width: 620,
        height: 620,
        color: theme.vars.palette.hero.accent,
        pointerEvents: 'none',
      })}
    >
      {[
        [300, 0.1],
        [220, 0.14],
        [140, 0.22],
        [60, 0.35],
      ].map(([r, opacity]) => (
        <circle
          key={r}
          cx="310"
          cy="310"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity={opacity}
        />
      ))}
      <circle cx="310" cy="250" r="4" fill="currentColor" />
    </Box>
  );
}

// Інформаційна панель ліворуч від форми (лише на широких екранах)
function BrandPanel() {
  return (
    <Stack
      sx={(theme) => ({
        display: { xs: 'none', md: 'flex' },
        position: 'relative',
        overflow: 'hidden',
        flex: '0 0 44%',
        maxWidth: 560,
        p: 6,
        justifyContent: 'space-between',
        color: theme.vars.palette.hero.text,
        bgcolor: theme.vars.palette.hero.bg,
      })}
    >
      <Rings />
      <Box sx={{ position: 'relative' }}>
        <BrandLogo size={32} inverse />
      </Box>
      <Box sx={{ position: 'relative' }}>
        <Typography
          component="p"
          sx={{
            fontSize: '2.375rem',
            fontWeight: 600,
            letterSpacing: '-0.025em',
            lineHeight: 1.15,
          }}
        >
          Консультація з викладачем – у кілька натискань
        </Typography>
        <Stack component="ul" spacing={1.75} sx={{ mt: 3.5, mb: 0, p: 0, listStyle: 'none' }}>
          {FEATURES.map((text) => (
            <Stack
              component="li"
              key={text}
              direction="row"
              spacing={1.5}
              sx={{ alignItems: 'center' }}
            >
              <Box
                aria-hidden="true"
                sx={(theme) => ({
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  flexShrink: 0,
                  bgcolor: theme.vars.palette.hero.accent,
                  boxShadow: '0 0 8px 1px rgba(136 192 208 / 0.7)',
                })}
              />
              <Typography sx={(theme) => ({ color: theme.vars.palette.hero.muted })}>
                {text}
              </Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Typography
        variant="caption"
        sx={(theme) => ({ position: 'relative', color: theme.vars.palette.hero.muted })}
      >
        Навчальний прототип електронного сервісу
      </Typography>
    </Stack>
  );
}

// Сторінка форми входу або реєстрації: панель сервісу ліворуч і картка з формою праворуч
export function AuthCard({ title, maxWidth = 420, children }) {
  usePageTitle(title);
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      <BrandPanel />
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          px: 2,
          py: 4,
        }}
      >
        <ThemeModeToggle sx={{ position: 'absolute', top: 12, right: 12 }} />
        <Box sx={{ display: { md: 'none' }, mb: 3 }}>
          <BrandLogo />
        </Box>
        <Card
          sx={(theme) => ({
            width: '100%',
            maxWidth,
            borderRadius: '20px',
            boxShadow: theme.vars.palette.glow.auth,
          })}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 4 }, '&:last-child': { pb: { xs: 2.5, sm: 4 } } }}>
            <Typography variant="h5" component="h1" sx={{ mb: 2.5 }}>
              {title}
            </Typography>
            {children}
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
