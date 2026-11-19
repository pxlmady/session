import { createTheme } from '@mui/material/styles';
import { ukUA } from '@mui/material/locale';

// Тема оформлення Session (етап 9а, редизайн): айдентика «чорнило й папір» –
// глибокий ірисово-синій (основний колір), теплий «паперовий» фон, акцент кольору
// календули для позначок і темна бічна панель у стилі обкладинки залікової книжки.
// Кольори тексту на тлі мають контраст не менше 4,5 : 1 (WCAG 2.1 AA) в обох схемах;
// колір лишається додатковою ознакою поруч із текстовою міткою (UX, табл. 5.1).

// Ключ localStorage, у якому зберігається вибір: light, dark або system.
// Той самий ключ читає скрипт в index.html, щоб сторінка не «блимала» під час завантаження.
export const THEME_STORAGE_KEY = 'session.theme';

// Ширина бічної панелі на широких екранах
export const SIDEBAR_WIDTH = 264;

const lightPalette = {
  primary: { main: '#3E3BC8', light: '#6A67E0', dark: '#2B2894', contrastText: '#FFFFFF' },
  secondary: { main: '#E3A21A', light: '#F2C45C', dark: '#8A5A00', contrastText: '#241800' },
  success: { main: '#1E7A45', dark: '#145C33', contrastText: '#FFFFFF' },
  warning: { main: '#A85400', dark: '#7A3C00', contrastText: '#FFFFFF' },
  info: { main: '#0B66A8', dark: '#074C7E', contrastText: '#FFFFFF' },
  error: { main: '#C4302B', dark: '#962420', contrastText: '#FFFFFF' },
  background: { default: '#F6F5F1', paper: '#FFFFFF' },
  text: { primary: '#161A2E', secondary: '#565B73' },
  divider: 'rgba(22, 26, 46, 0.10)',
  // Власні токени Session
  sidebar: {
    bg: '#15183A',
    border: 'rgba(255, 255, 255, 0.06)',
    text: '#E9EAF7',
    muted: '#A3A6CC',
    hover: 'rgba(255, 255, 255, 0.07)',
  },
  // subtle – шапки таблиць і доріжка вкладок; inset – елементи всередині панелей-віджетів;
  // raised – активна вкладка
  surface: { subtle: '#EFEEE8', inset: '#F6F5F1', raised: '#FFFFFF' },
};

const darkPalette = {
  primary: { main: '#A9A6FF', light: '#CBC9FF', dark: '#8380F0', contrastText: '#14123A' },
  secondary: { main: '#F4C04E', light: '#F8D688', dark: '#D9A22A', contrastText: '#241800' },
  success: { main: '#6FD39B', light: '#9DE3BB', contrastText: '#062314' },
  warning: { main: '#FFB45E', light: '#FFCF98', contrastText: '#2B1700' },
  info: { main: '#6CBAF5', light: '#A0D2F8', contrastText: '#04202E' },
  error: { main: '#FF9A93', light: '#FFC0BB', contrastText: '#2A0707' },
  background: { default: '#0E1020', paper: '#161931' },
  text: { primary: '#ECEDF7', secondary: '#A7AAC6' },
  divider: 'rgba(236, 237, 247, 0.10)',
  sidebar: {
    bg: '#0A0C1A',
    border: 'rgba(255, 255, 255, 0.06)',
    text: '#E9EAF7',
    muted: '#9497BD',
    hover: 'rgba(255, 255, 255, 0.06)',
  },
  surface: { subtle: '#12152A', inset: '#1C2040', raised: '#262B55' },
};

const STATUS_COLORS = ['primary', 'secondary', 'success', 'warning', 'info', 'error'];

// Напівпрозорий колір палітри через CSS-змінну каналу (працює в обох схемах)
export const tint = (theme, color, opacity) =>
  `rgba(${theme.vars.palette[color].mainChannel} / ${opacity})`;

// Колір тексту «тонального» елемента: темний відтінок у світлій схемі, світлий – у темній.
// darkExtra – інші стилі темної схеми (в одному applyStyles, щоб ключі селектора не перезаписались)
const tonalText = (theme, color, darkExtra = {}) => ({
  color: theme.vars.palette[color].dark,
  ...theme.applyStyles('dark', { color: theme.vars.palette[color].light, ...darkExtra }),
});

export const theme = createTheme(
  {
    // CSS-змінні дають змогу перемикати схему без перерендерингу; клас .light / .dark на <html>
    cssVariables: { colorSchemeSelector: 'class' },
    colorSchemes: {
      light: { palette: lightPalette },
      dark: { palette: darkPalette },
    },
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: '"Inter Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2 },
      h5: { fontWeight: 750, letterSpacing: '-0.015em' },
      h6: { fontWeight: 700, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 650 },
      overline: { fontWeight: 700, letterSpacing: '0.08em', lineHeight: 1.6 },
      // Написи кнопок без великих літер: українські слова капсом читаються гірше
      button: { textTransform: 'none', fontWeight: 650, letterSpacing: 0 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          // Тонка смуга прокрутки в кольорах теми (CSS scrollbar-color / scrollbar-width,
          // підтримують Chrome, Edge, Firefox, Safari 26+). Місце під смугу не резервується
          // (scrollbar-gutter): інакше праворуч лишалася порожня смуга, а з відкритим меню чи
          // діалогом MUI додає ще й власний відступ, і шапка зсувається
          '*': {
            scrollbarWidth: 'thin',
            scrollbarColor: `${tint(theme, 'primary', 0.35)} transparent`,
          },
          body: { fontFeatureSettings: '"cv11", "ss01"' },
          '::selection': { backgroundColor: tint(theme, 'primary', 0.22) },
        }),
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: ({ theme }) => ({
            backgroundColor: theme.vars.palette.sidebar.bg,
            color: theme.vars.palette.sidebar.text,
            backgroundImage: 'none',
            borderBottom: `1px solid ${theme.vars.palette.sidebar.border}`,
          }),
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 10, paddingInline: 16 },
          sizeSmall: { borderRadius: 8, paddingInline: 10 },
          sizeLarge: { borderRadius: 12, paddingBlock: 10 },
          contained: ({ theme }) => ({
            boxShadow: `inset 0 1px 0 rgba(255 255 255 / 0.14), 0 1px 2px rgba(22 26 46 / 0.12)`,
            '&:hover': {
              boxShadow: `inset 0 1px 0 rgba(255 255 255 / 0.14), 0 4px 12px ${tint(theme, 'primary', 0.28)}`,
            },
          }),
          outlined: ({ theme }) => ({
            borderColor: theme.vars.palette.divider,
            '&:hover': { borderColor: 'currentColor' },
          }),
        },
      },
      MuiIconButton: {
        styleOverrides: { root: { borderRadius: 10 } },
      },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 16,
            borderColor: theme.vars.palette.divider,
            boxShadow: '0 1px 2px rgba(22 26 46 / 0.04), 0 2px 10px rgba(22 26 46 / 0.03)',
            transition: 'border-color .15s ease, box-shadow .15s ease, transform .15s ease',
            // Картка-посилання (CardActionArea) піднімається під курсором
            '&:has(> .MuiCardActionArea-root):hover': {
              borderColor: tint(theme, 'primary', 0.45),
              boxShadow: `0 8px 24px ${tint(theme, 'primary', 0.12)}`,
              transform: 'translateY(-2px)',
            },
            ...theme.applyStyles('dark', { boxShadow: 'none' }),
          }),
        },
      },
      MuiCardContent: {
        styleOverrides: { root: { padding: 20, '&:last-child': { paddingBottom: 20 } } },
      },
      MuiCardActionArea: {
        styleOverrides: { focusHighlight: { opacity: 0 } },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        },
      },
      MuiChip: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontWeight: 600,
            borderRadius: 8,
            variants: [
              // «Тональні» мітки: м'яке тло й насичений текст замість суцільної заливки
              ...STATUS_COLORS.map((color) => ({
                props: { variant: 'filled', color },
                style: {
                  backgroundColor: tint(theme, color, 0.14),
                  ...tonalText(theme, color, { backgroundColor: tint(theme, color, 0.18) }),
                  '&.MuiChip-clickable:hover': { backgroundColor: tint(theme, color, 0.24) },
                  '& .MuiChip-icon': { color: 'inherit' },
                },
              })),
              {
                props: { variant: 'filled', color: 'default' },
                style: {
                  backgroundColor: theme.vars.palette.action.selected,
                  color: theme.vars.palette.text.secondary,
                },
              },
              ...STATUS_COLORS.map((color) => ({
                props: { variant: 'outlined', color },
                style: {
                  borderColor: tint(theme, color, 0.45),
                  ...tonalText(theme, color),
                  '& .MuiChip-icon': { color: 'inherit' },
                },
              })),
            ],
          }),
          sizeSmall: { height: 24, fontSize: '0.75rem' },
        },
      },
      MuiAvatar: {
        styleOverrides: { root: { fontWeight: 700, letterSpacing: '0.02em' } },
      },
      MuiTableContainer: {
        styleOverrides: { root: { borderRadius: 16 } },
      },
      MuiTableHead: {
        styleOverrides: {
          root: ({ theme }) => ({
            '& .MuiTableCell-head': {
              backgroundColor: theme.vars.palette.surface.subtle,
              color: theme.vars.palette.text.secondary,
              fontSize: '0.8125rem',
              fontWeight: 650,
              letterSpacing: '0.01em',
            },
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            '.MuiTableBody-root > &:hover': { backgroundColor: tint(theme, 'primary', 0.035) },
            '.MuiTableBody-root > &:last-of-type > .MuiTableCell-root': { borderBottom: 0 },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
          head: { fontWeight: 650 },
        },
      },
      // Вкладки – сегментований перемикач: «доріжка» з активною вкладкою-плашкою
      MuiTabs: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: 0,
            width: 'fit-content',
            maxWidth: '100%',
            padding: 4,
            borderRadius: 14,
            backgroundColor: theme.vars.palette.surface.subtle,
            border: `1px solid ${theme.vars.palette.divider}`,
          }),
          indicator: ({ theme }) => ({
            height: '100%',
            borderRadius: 10,
            // Активна вкладка – тонована плашка основного кольору (однаково в обох схемах)
            backgroundColor: tint(theme, 'primary', 0.12),
            ...theme.applyStyles('dark', { backgroundColor: theme.vars.palette.surface.raised }),
          }),
          scrollButtons: { borderRadius: 10 },
        },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            zIndex: 1,
            textTransform: 'none',
            fontWeight: 650,
            fontSize: '0.9375rem',
            minHeight: 38,
            padding: '6px 18px',
            borderRadius: 10,
          },
        },
      },
      MuiToggleButton: {
        styleOverrides: {
          root: { textTransform: 'none', fontWeight: 600 },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          // Фокус показує лише стандартна рамка MUI (2 px основного кольору): додаткове кільце
          // навколо поля давало подвійну рамку й перетинало напис над полем
          root: ({ theme }) => ({
            borderRadius: 10,
            backgroundColor: theme.vars.palette.background.paper,
          }),
          notchedOutline: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        },
      },
      // Підпис групи перемикачів (FormLabel) не змінює колір, коли фокус на перемикачі в групі.
      // Написи текстових полів (InputLabel) і далі підсвічуються у фокусі.
      MuiFormLabel: {
        styleOverrides: {
          root: ({ theme }) => ({
            '&:not(.MuiInputLabel-root)': { fontWeight: 600 },
            '&.Mui-focused:not(.MuiInputLabel-root):not(.Mui-error)': {
              color: theme.vars.palette.text.secondary,
            },
          }),
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { borderRadius: 20 },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            variants: [
              {
                props: { invisible: false },
                style: { backgroundColor: 'rgba(14 16 32 / 0.55)', backdropFilter: 'blur(3px)' },
              },
            ],
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 750, letterSpacing: '-0.01em' } },
      },
      MuiAlert: {
        styleOverrides: {
          root: { borderRadius: 12, alignItems: 'center' },
          // Обведений варіант – з м'яким тлом відповідного кольору
          outlined: ({ theme }) => ({
            variants: STATUS_COLORS.filter((c) => !['primary', 'secondary'].includes(c)).map(
              (color) => ({
                props: { severity: color },
                style: {
                  backgroundColor: tint(theme, color, 0.07),
                  borderColor: tint(theme, color, 0.35),
                },
              }),
            ),
          }),
        },
      },
      MuiTooltip: {
        // Відступ від країв вікна: підказка біля краю (перемикач теми) не виходить за межі
        // екрана й не викликає смуг прокрутки та зсуву розмітки
        defaultProps: {
          slotProps: {
            popper: { modifiers: [{ name: 'preventOverflow', options: { padding: 8 } }] },
          },
        },
        styleOverrides: {
          tooltip: ({ theme }) => ({
            backgroundColor: theme.vars.palette.sidebar.bg,
            color: theme.vars.palette.sidebar.text,
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
          }),
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.vars.palette.divider}`,
            boxShadow: '0 12px 32px rgba(14 16 32 / 0.16)',
          }),
        },
      },
      MuiSkeleton: {
        styleOverrides: { rounded: { borderRadius: 14 } },
      },
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          track: { borderRadius: 11, opacity: 0.35 },
          thumb: { boxShadow: 'none', width: 16, height: 16, margin: 2 },
        },
      },
      MuiLink: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  },
  ukUA,
);
