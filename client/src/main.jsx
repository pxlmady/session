import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource-variable/inter';
import App from './App.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { NotificationProvider } from './context/NotificationProvider.jsx';
import { THEME_STORAGE_KEY, theme } from './theme.js';

// Тема Session зі світлою й темною схемами (етап 9а); за замовчуванням – як у системі.
// enableColorScheme узгоджує зі схемою смуги прокрутки й вбудовані елементи браузера.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme} defaultMode="system" modeStorageKey={THEME_STORAGE_KEY} noSsr>
      <CssBaseline enableColorScheme />
      <BrowserRouter>
        <NotificationProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </NotificationProvider>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
