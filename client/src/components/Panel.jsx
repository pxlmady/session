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
        ...(tone
          ? {
              bgcolor: tint(theme, tone, 0.12),
              color: theme.vars.palette[tone].dark,
              ...theme.applyStyles('dark', {
                bgcolor: tint(theme, tone, 0.18),
                color: theme.vars.palette[tone].light,
              }),
            }
          : {
              bgcolor: theme.vars.palette.action.selected,
              color: theme.vars.palette.text.secondary,
            }),
      })}
    >
      <Icon fontSize="small" />
    </Box>
  );
}

// Панель-віджет: заголовок з іконкою на кольоровій плашці, необов'язкове посилання праворуч
// і вміст. Картки всередині панелі мають м'яке тло без рамки, щоб не було «рамки в рамці».
// Панель побудована на Paper, а не на Card: e2e-тести шукають картки за класом .MuiCard-root.
export function Panel({ title, icon: Icon, tone = 'primary', action, children }) {
  return (
    <Paper
      component="section"
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 2, sm: 2.5 },
        borderRadius: '20px',
        boxShadow: '0 1px 2px rgba(22 26 46 / 0.04), 0 4px 18px rgba(22 26 46 / 0.04)',
        ...theme.applyStyles('dark', { boxShadow: 'none' }),
        '& .MuiCard-root': {
          bgcolor: theme.vars.palette.surface.inset,
          borderColor: 'transparent',
          boxShadow: 'none',
        },
      })}
    >
      <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 2, minHeight: 36 }}>
        {Icon && <IconTile icon={Icon} tone={tone} />}
        <Typography variant="h6" component="h2" sx={{ flexGrow: 1, fontSize: '1.05rem' }}>
          {title}
        </Typography>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}
