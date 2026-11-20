import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router';
import {
  AppBar,
  Box,
  Container,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import PersonOutlineIcon from '@mui/icons-material/PersonOutlined';
import SchoolOutlinedIcon from '@mui/icons-material/SchoolOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import SupervisorAccountOutlinedIcon from '@mui/icons-material/SupervisorAccountOutlined';
import { useAuth } from '../context/auth-context.js';
import { SIDEBAR_WIDTH } from '../theme.js';
import { ROLE_LABELS } from '../utils/labels.js';
import { menuItems, roleHome } from '../utils/roles.js';
import { BrandLogo } from './BrandMark.jsx';
import { ThemeModeToggle } from './ThemeModeToggle.jsx';
import { UserAvatar } from './UserAvatar.jsx';

// Іконки пунктів меню за адресою сторінки
const MENU_ICONS = {
  '/dashboard': GridViewOutlinedIcon,
  '/schedule': CalendarMonthOutlinedIcon,
  '/academic': SchoolOutlinedIcon,
  '/teachers': SupervisorAccountOutlinedIcon,
  '/my-bookings': EventNoteOutlinedIcon,
  '/slots': ScheduleOutlinedIcon,
  '/admin': AdminPanelSettingsOutlinedIcon,
  '/profile': PersonOutlineIcon,
};

// Відступ «плаваючої» бічної панелі від країв вікна на широких екранах
const SIDEBAR_GAP = 12;

// Вміст бічної панелі: знак сервісу, меню ролі, перемикач теми, користувач і кнопка «Вийти».
// floating – окрема заокруглена панель з відступами (широкі екрани), інакше – на всю висоту.
function SidebarContent({ user, items, isActive, onNavigate, onLogout, floating = false }) {
  return (
    <Stack
      sx={(theme) => ({
        height: '100%',
        overflowY: 'auto',
        bgcolor: theme.vars.palette.sidebar.bg,
        border: floating ? `1px solid ${theme.vars.palette.sidebar.border}` : 0,
        borderRadius: floating ? '18px' : 0,
        boxShadow: floating ? theme.vars.palette.glow.card : 'none',
        color: theme.vars.palette.sidebar.text,
      })}
    >
      <Box
        component={RouterLink}
        to={roleHome(user)}
        onClick={onNavigate}
        sx={{ px: '22px', pt: 2.5, pb: 2, color: 'inherit', textDecoration: 'none' }}
      >
        <BrandLogo />
      </Box>

      <Typography
        variant="overline"
        sx={(theme) => ({
          px: 3,
          pt: 1,
          color: theme.vars.palette.sidebar.caption,
          fontSize: '0.6875rem',
          fontWeight: 400,
        })}
      >
        Меню
      </Typography>
      <List component="nav" aria-label="Головне меню" sx={{ px: 1.5, py: 0.5, flexGrow: 1 }}>
        {items.map((item) => {
          const Icon = MENU_ICONS[item.to] ?? GridViewOutlinedIcon;
          const active = isActive(item.to);
          return (
            <ListItemButton
              key={item.to}
              component={RouterLink}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              onClick={onNavigate}
              sx={(theme) => ({
                borderRadius: '10px',
                mb: 0.25,
                py: 0.875,
                color: active ? theme.vars.palette.sidebar.text : theme.vars.palette.sidebar.muted,
                bgcolor: active ? theme.vars.palette.sidebar.active : 'transparent',
                boxShadow: active ? theme.vars.palette.sidebar.activeShadow : 'none',
                '&:hover': {
                  bgcolor: active
                    ? theme.vars.palette.sidebar.active
                    : theme.vars.palette.sidebar.hover,
                  color: theme.vars.palette.sidebar.text,
                },
                '& .MuiListItemIcon-root': {
                  color: active ? theme.vars.palette.primary.main : 'inherit',
                },
              })}
            >
              <ListItemIcon sx={{ minWidth: 38, color: 'inherit' }}>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                slotProps={{
                  primary: { sx: { fontWeight: active ? 600 : 500, fontSize: '0.875rem' } },
                }}
              />
              {/* Позначка активного пункту – точка акцентного кольору (у темній схемі світиться) */}
              {active && (
                <Box
                  aria-hidden="true"
                  sx={(theme) => ({
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    flexShrink: 0,
                    bgcolor: 'primary.main',
                    boxShadow: `${theme.vars.palette.glow.dot} ${theme.vars.palette.primary.main}`,
                  })}
                />
              )}
            </ListItemButton>
          );
        })}
      </List>

      <Box sx={{ p: 1.5 }}>
        <Box
          sx={(theme) => ({
            p: 1.5,
            borderRadius: '14px',
            bgcolor: theme.vars.palette.surface.subtle,
            border: `1px solid ${theme.vars.palette.sidebar.border}`,
          })}
        >
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <UserAvatar user={user} size={38} />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" noWrap sx={{ fontWeight: 600 }} title={user.fullName}>
                {user.fullName}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={(theme) => ({ display: 'block', color: theme.vars.palette.sidebar.muted })}
              >
                {ROLE_LABELS[user.role]}
              </Typography>
            </Box>
          </Stack>
          <Stack
            direction="row"
            sx={(theme) => ({
              mt: 1.25,
              pt: 1,
              borderTop: `1px solid ${theme.vars.palette.sidebar.border}`,
              justifyContent: 'space-between',
              alignItems: 'center',
              color: theme.vars.palette.sidebar.muted,
            })}
          >
            <ThemeModeToggle sx={{ '&:hover': { color: 'sidebar.text' } }} />
            <Tooltip title="Вийти з облікового запису">
              <IconButton
                color="inherit"
                aria-label="Вийти"
                onClick={onLogout}
                sx={{ '&:hover': { color: 'sidebar.text' } }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
      </Box>
    </Stack>
  );
}

// Каркас захищених сторінок: на екранах від 1200 px (lg) – постійна бічна панель з меню ролі,
// користувачем і кнопкою «Вийти»; на вужчих – верхня панель, а меню відкривається збоку (UX, п. 2.3).
export function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = menuItems(user);
  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`);

  const sidebarProps = { user, items, isActive };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Широкі екрани: постійна «плаваюча» бічна панель */}
      <Box
        component="aside"
        sx={{
          display: { xs: 'none', lg: 'block' },
          position: 'fixed',
          top: SIDEBAR_GAP,
          bottom: SIDEBAR_GAP,
          left: SIDEBAR_GAP,
          width: SIDEBAR_WIDTH,
          zIndex: (theme) => theme.zIndex.appBar,
        }}
      >
        <SidebarContent {...sidebarProps} floating onLogout={() => logout()} />
      </Box>

      {/* Вузькі екрани: верхня панель і висувне меню */}
      <AppBar position="sticky" sx={{ display: { lg: 'none' } }}>
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Відкрити меню"
            onClick={() => setDrawerOpen(true)}
          >
            <MenuIcon />
          </IconButton>
          <Box
            component={RouterLink}
            to={roleHome(user)}
            sx={{ color: 'inherit', textDecoration: 'none', flexGrow: 1, minWidth: 0 }}
          >
            <BrandLogo size={30} caption={null} />
          </Box>
          <ThemeModeToggle />
          <UserAvatar user={user} size={32} />
        </Toolbar>
      </AppBar>
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        slotProps={{ paper: { sx: { width: SIDEBAR_WIDTH, border: 0 } } }}
      >
        <SidebarContent
          {...sidebarProps}
          onNavigate={() => setDrawerOpen(false)}
          onLogout={() => {
            setDrawerOpen(false);
            logout();
          }}
        />
      </Drawer>

      <Box sx={{ ml: { lg: `${SIDEBAR_WIDTH + SIDEBAR_GAP}px` } }}>
        <Container
          maxWidth="lg"
          component="main"
          sx={{ py: { xs: 2.5, sm: 4, md: 4 }, px: { xs: 2, sm: 3, md: 5 } }}
        >
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
}
