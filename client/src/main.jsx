import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ukUA } from '@mui/material/locale';
import App from './App.jsx';
import { AuthProvider } from './context/AuthProvider.jsx';
import { NotificationProvider } from './context/NotificationProvider.jsx';

// Тема MUI за замовчуванням з українською локалізацією стандартних компонентів
const theme = createTheme({}, ukUA);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
