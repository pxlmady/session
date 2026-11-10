import { useState } from 'react';
import {
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  useColorScheme,
} from '@mui/material';
import CheckIcon from '@mui/icons-material/Check';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import SettingsBrightnessOutlinedIcon from '@mui/icons-material/SettingsBrightnessOutlined';

const MODES = [
  { value: 'light', label: 'Світла', Icon: LightModeOutlinedIcon },
  { value: 'dark', label: 'Темна', Icon: DarkModeOutlinedIcon },
  { value: 'system', label: 'Як у системі', Icon: SettingsBrightnessOutlinedIcon },
];

// Перемикач теми оформлення: світла, темна або як у налаштуваннях системи.
// Вибір зберігається в браузері (localStorage) і діє для всіх сторінок.
export function ThemeModeToggle({ sx }) {
  const { mode, setMode } = useColorScheme();
  const [anchor, setAnchor] = useState(null);
  const current = MODES.find((item) => item.value === mode) ?? MODES[2];

  return (
    <>
      <Tooltip title="Тема оформлення">
        <IconButton
          color="inherit"
          aria-label={`Тема оформлення: ${current.label.toLowerCase()}`}
          aria-haspopup="menu"
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={sx}
        >
          <current.Icon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {MODES.map(({ value, label, Icon }) => (
          <MenuItem
            key={value}
            selected={value === current.value}
            onClick={() => {
              setMode(value);
              setAnchor(null);
            }}
          >
            <ListItemIcon>
              <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText>{label}</ListItemText>
            {value === current.value && <CheckIcon fontSize="small" sx={{ ml: 2 }} />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
