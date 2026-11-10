import { createTheme } from '@mui/material/styles';
import { ukUA } from '@mui/material/locale';

// Тема оформлення Session (етап 9а): світла й темна колірні схеми, шрифт Inter,
// єдині налаштування компонентів. Кольори статусів підібрано з контрастом тексту
// не менше 4,5 : 1 (WCAG 2.1 AA) в обох схемах; колір лишається додатковою ознакою
// поруч із текстовою міткою (UX, табл. 5.1).

// Ключ localStorage, у якому зберігається вибір: light, dark або system.
// Той самий ключ читає скрипт в index.html, щоб сторінка не «блимала» під час завантаження.
export const THEME_STORAGE_KEY = 'session.theme';

const lightPalette = {
  primary: { main: '#3446B0', light: '#5C6BC0', dark: '#26338A', contrastText: '#FFFFFF' },
  secondary: { main: '#00796B', contrastText: '#FFFFFF' },
  success: { main: '#2E7D32', contrastText: '#FFFFFF' },
  warning: { main: '#A85000', contrastText: '#FFFFFF' },
  info: { main: '#01579B', contrastText: '#FFFFFF' },
  error: { main: '#C62828', contrastText: '#FFFFFF' },
  background: { default: '#F4F5FA', paper: '#FFFFFF' },
  text: { primary: '#1B1F2E', secondary: '#525870' },
  divider: 'rgba(27, 31, 46, 0.12)',
};

const darkPalette = {
  primary: { main: '#9FB0FF', light: '#C5CEFF', dark: '#7186E8', contrastText: '#0D1330' },
  secondary: { main: '#5FD3C2', contrastText: '#002A24' },
  success: { main: '#81C784', contrastText: '#0B1F0C' },
  warning: { main: '#FFB74D', contrastText: '#2B1700' },
  info: { main: '#64B5F6', contrastText: '#04202E' },
  error: { main: '#EF9A9A', contrastText: '#2A0707' },
  background: { default: '#0F1220', paper: '#171B2E' },
  text: { primary: '#E6E8F2', secondary: '#A9AEC6' },
  divider: 'rgba(230, 232, 242, 0.12)',
};

export const theme = createTheme(
  {
    // CSS-змінні дають змогу перемикати схему без перерендерингу; клас .light / .dark на <html>
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
      light: { palette: lightPalette },
      dark: { palette: darkPalette },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 650 },
      h6: { fontWeight: 600 },
      // Написи кнопок без великих літер: українські слова капсом читаються гірше
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiAppBar: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: ({ theme }) => ({
            borderBottom: `1px solid ${theme.vars.palette.divider}`,
            // У темній схемі панель має колір поверхні, а не яскраво-синій
            ...theme.applyStyles('dark', {
              backgroundColor: theme.vars.palette.background.paper,
              color: theme.vars.palette.text.primary,
              backgroundImage: 'none',
            }),
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: { root: { borderRadius: 8 } },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
      },
      MuiPaper: {
        styleOverrides: { root: { backgroundImage: 'none' } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500 } },
      },
      MuiTableCell: {
        styleOverrides: { head: { fontWeight: 600 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 14 } },
      },
      MuiAlert: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
    },
  },
  ukUA,
);
