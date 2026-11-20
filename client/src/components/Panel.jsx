import { Box, Paper, Stack, Typography } from '@mui/material';
import { tint } from '../theme.js';

// Іконка на кольоровій плашці (заголовки панелей, картки показників).
// tone – колір палітри або null для нейтральної сірої плашки.
export function IconTile({ icon: Icon, tone = 'primary', size = 36 }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '10px',
        display: 'grid',
        placeItems: 'center',
        border: `1px solid ${theme.vars.palette.divider}`,
        ...(tone
          ? {
              bgcolor: tint(theme, tone, 0.08),
              color: theme.vars.palette[tone].dark,
              ...theme.applyStyles('dark', {
                bgcolor: tint(theme, tone, 0.1),
                color: theme.vars.palette[tone].light,
              }),
            }
          : {
              bgcolor: theme.vars.palette.surface.subtle,
              color: theme.vars.palette.text.secondary,
            }),
      })}
    >
      <Icon fontSize="small" />
    </Box>
  );
}

// Панель-віджет: заголовок, необов'язкове посилання праворуч і вміст. Іконка заголовка
// (icon, tone) у монохромному оформленні не показується; пропси лишаються для сумісності.
// Картки всередині панелі мають приглушене тло й тонку рамку.
// Панель побудована на Paper, а не на Card: e2e-тести шукають картки за класом .MuiCard-root.
export function Panel({ title, action, children }) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 2, sm: 2.5 },
        borderRadius: '16px',
        boxShadow: theme.vars.palette.glow.card,
        '& .MuiCard-root': {
          bgcolor: theme.vars.palette.surface.inset,
          borderColor: theme.vars.palette.divider,
          borderRadius: '12px',
          boxShadow: 'none',
        },
      })}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.75, minHeight: 32 }}>
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1, fontSize: '1rem' }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
