import { useId } from 'react';
import { Box } from '@mui/material';
import { avatarHue, initialsOf } from '../utils/avatar.js';

// Тло шапки профілю: аватар-заглушка користувача, що повторюється рядами під невеликим
// нахилом (сусідні ряди зміщені). Вбудований SVG-візерунок – без зображень і запитів.
// Кольори – ті самі, що в UserAvatar, з урахуванням світлої й темної схем.
const TILE = 80;

export function AvatarPattern({ user, height = 88 }) {
  const id = `avatar-pattern-${useId().replace(/:/g, '')}`;
  const hue = avatarHue(user);
  const initials = initialsOf(user?.fullName);
  const circle = (cx, cy) => (
    <g key={`${cx}-${cy}`}>
      <circle cx={cx} cy={cy} r={17} />
      <text x={cx} y={cy} dy="0.35em" textAnchor="middle">
        {initials}
      </text>
    </g>
  );

  return (
    <Box
      aria-hidden="true"
      sx={(theme) => ({
        height,
        overflow: 'hidden',
        bgcolor: `hsl(${hue} 70% 96%)`,
        borderBottom: `1px solid ${theme.vars.palette.divider}`,
        '& circle': { fill: `hsl(${hue} 80% 86%)` },
        '& text': {
          fill: `hsl(${hue} 50% 34%)`,
          fontFamily: theme.typography.fontFamily,
          fontSize: 13,
          fontWeight: 700,
        },
        ...theme.applyStyles('dark', {
          bgcolor: `hsl(${hue} 35% 14%)`,
          borderBottom: 0,
          '& circle': { fill: `hsl(${hue} 40% 24%)` },
          '& text': { fill: `hsl(${hue} 70% 78%)` },
        }),
      })}
    >
      <svg width="100%" height="100%">
        <defs>
          <pattern
            id={id}
            width={TILE}
            height={TILE}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(-18)"
          >
            {circle(TILE / 4, TILE / 4)}
            {circle((TILE * 3) / 4, (TILE * 3) / 4)}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
    </Box>
  );
}
