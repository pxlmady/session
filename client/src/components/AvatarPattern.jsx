import { Box } from '@mui/material';

// Тло шапки профілю: приглушена смуга з тонкими концентричними колами акцентного кольору
// (той самий мотив, що й на сторінці входу). Вбудований SVG – без зображень і запитів.
// Проп user лишається для сумісності з попереднім візерунком з ініціалів.
const RINGS = [
  [200, 0.14],
  [150, 0.2],
  [100, 0.28],
  [50, 0.38],
];

export function AvatarPattern({ height = 112 }) {
  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        position: 'relative',
        height,
        overflow: 'hidden',
        bgcolor: theme.vars.palette.surface.subtle,
        borderBottom: `1px solid ${theme.vars.palette.divider}`,
        color: theme.vars.palette.primary.main,
      })}
    >
      <Box
        component="svg"
        viewBox="0 0 420 420"
        sx={{ position: 'absolute', right: -90, top: -150, width: 420, height: 420 }}
      >
        {RINGS.map(([r, opacity]) => (
          <circle
            key={r}
            cx="210"
            cy="210"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeOpacity={opacity}
          />
        ))}
      </Box>
    </Box>
  );
}
