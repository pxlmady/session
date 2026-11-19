import { Avatar } from '@mui/material';
import { avatarHue, initialsOf } from '../utils/avatar.js';

// Аватар-заглушка облікового запису: ініціали на кольоровому тлі (utils/avatar.js).
// Текст має контраст з тлом ≥ 4,5 : 1 в обох схемах.

// Аватар декоративний (ПІБ завжди виводиться поруч текстом), тому прихований від читачів екрана
export function UserAvatar({ user, size = 40, sx }) {
  const hue = avatarHue(user);
  return (
    <Avatar
      aria-hidden="true"
      sx={[
        (theme) => ({
          width: size,
          height: size,
          fontSize: size * 0.38,
          color: `hsl(${hue} 55% 26%)`,
          background: `linear-gradient(135deg, hsl(${hue} 85% 88%), hsl(${(hue + 30) % 360} 80% 80%))`,
          ...theme.applyStyles('dark', {
            color: `hsl(${hue} 90% 90%)`,
            background: `linear-gradient(135deg, hsl(${hue} 45% 34%), hsl(${(hue + 30) % 360} 45% 26%))`,
          }),
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {initialsOf(user?.fullName)}
    </Avatar>
  );
}
