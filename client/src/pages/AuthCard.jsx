import { Box, Card, CardContent, Stack, Typography } from '@mui/material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import { BrandLogo } from '../components/BrandMark.jsx';
import { ThemeModeToggle } from '../components/ThemeModeToggle.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

const FEATURES = [
  { Icon: EventAvailableOutlinedIcon, text: 'Вільний час викладачів в одному місці' },
  { Icon: SchoolOutlinedIcon, text: 'Розклад, оцінки й заборгованості поруч із записом' },
  { Icon: NotificationsActiveOutlinedIcon, text: 'Статус запису й нагадування про консультацію' },
];

// Інформаційна панель ліворуч від форми (лише на широких екранах)
function BrandPanel() {
  return (
    <Stack
      sx={(theme) => ({
        display: { xs: 'none', md: 'flex' },
        flex: '0 0 44%',
        maxWidth: 560,
        p: 6,
        justifyContent: 'space-between',
        color: theme.vars.palette.sidebar.text,
        bgcolor: theme.vars.palette.sidebar.bg,
        backgroundImage: [
          `radial-gradient(80% 60% at 0% 0%, rgba(${theme.vars.palette.primary.mainChannel} / 0.45), transparent 70%)`,
          `radial-gradient(60% 50% at 100% 100%, rgba(${theme.vars.palette.secondary.mainChannel} / 0.1), transparent 70%)`,
          // Тонка «зошитова» сітка
          'linear-gradient(rgba(255 255 255 / 0.035) 1px, transparent 1px)',
          'linear-gradient(90deg, rgba(255 255 255 / 0.035) 1px, transparent 1px)',
        ].join(', '),
        backgroundSize: 'auto, auto, 28px 28px, 28px 28px',
      })}
    >
      <BrandLogo size={40} />
      <Box>
        <Typography
          component="p"
          sx={{ fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.15 }}
        >
          Консультація з викладачем – у кілька натискань
        </Typography>
        <Stack spacing={1.75} sx={{ mt: 4 }}>
          {FEATURES.map(({ Icon, text }) => (
            <Stack key={text} direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: '10px',
                  display: 'grid',
                  placeItems: 'center',
                  bgcolor: 'rgba(255 255 255 / 0.08)',
                  color: 'secondary.light',
                  flexShrink: 0,
                }}
              >
                <Icon fontSize="small" />
              </Box>
              <Typography sx={{ opacity: 0.88 }}>{text}</Typography>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.55 }}>
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
        <Card sx={{ width: '100%', maxWidth, borderRadius: '24px' }}>
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
