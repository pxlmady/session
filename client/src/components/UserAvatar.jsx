import { Avatar } from '@mui/material';
import { initialsOf } from '../utils/avatar.js';

// Аватар-заглушка облікового запису: ініціали на нейтральному тлі з тонкою рамкою
// (монохромне оформлення). Текст має контраст з тлом ≥ 4,5 : 1 в обох схемах.

// Аватар декоративний (ПІБ завжди виводиться поруч текстом), тому прихований від читачів екрана
export function UserAvatar({ user, size = 40, sx }) {
  return (
    <Avatar
      aria-hidden="true"
      sx={[
        (theme) => ({
          width: size,
          height: size,
          fontSize: size * 0.38,
          color: theme.vars.palette.text.primary,
          backgroundColor: theme.vars.palette.surface.subtle,
          border: `1px solid ${theme.vars.palette.divider}`,
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {initialsOf(user?.fullName)}
    </Avatar>
  );
}
