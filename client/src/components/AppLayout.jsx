import { useState } from 'react';
import { Link as RouterLink, Outlet, useLocation } from 'react-router';
import {
  AppBar,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../context/auth-context.js';
import { ROLE_LABELS } from '../utils/labels.js';
import { menuItems, roleHome } from '../utils/roles.js';

// Каркас захищених сторінок: верхня панель із меню ролі, ПІБ і роллю, кнопкою «Вийти»;
// на екранах, вужчих за 900 px (md), меню відкривається з бічної панелі (UX, п. 2.3).
export function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = menuItems(user);
  const isActive = (to) => pathname === to || pathname.startsWith(`${to}/`);
  const userLabel = `${user.fullName} · ${ROLE_LABELS[user.role]}`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.50' }}>
      <AppBar position="sticky">
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            color="inherit"
            edge="start"
            aria-label="Відкрити меню"
            onClick={() => setDrawerOpen(true)}
            sx={{ display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            component={RouterLink}
            to={roleHome(user)}
            sx={{ color: 'inherit', textDecoration: 'none', fontWeight: 700, mr: 2 }}
          >
            Session
          </Typography>
          <Box component="nav" sx={{ display: { xs: 'none', md: 'flex' }, gap: 0.5, flexGrow: 1 }}>
            {items.map((item) => (
              <Button
                key={item.to}
                component={RouterLink}
                to={item.to}
                color="inherit"
                aria-current={isActive(item.to) ? 'page' : undefined}
                sx={{ bgcolor: isActive(item.to) ? 'rgba(255,255,255,0.18)' : 'transparent' }}
              >
                {item.label}
              </Button>
            ))}
          </Box>
          <Box sx={{ flexGrow: 1, display: { md: 'none' } }} />
          <Typography
            variant="body2"
            noWrap
            sx={{ display: { xs: 'none', md: 'block' }, opacity: 0.9, maxWidth: 320 }}
          >
            {userLabel}
          </Typography>
          <Button
            color="inherit"
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={() => logout()}
            sx={{ display: { xs: 'none', md: 'inline-flex' }, ml: 1 }}
          >
            Вийти
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation">
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Session
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {userLabel}
            </Typography>
          </Box>
          <Divider />
          <List component="nav">
            {items.map((item) => (
              <ListItemButton
                key={item.to}
                component={RouterLink}
                to={item.to}
                selected={isActive(item.to)}
                onClick={() => setDrawerOpen(false)}
              >
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
            <Divider sx={{ my: 1 }} />
            <ListItemButton
              onClick={() => {
                setDrawerOpen(false);
                logout();
              }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              <ListItemText primary="Вийти" />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>

      <Container maxWidth="lg" component="main" sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
