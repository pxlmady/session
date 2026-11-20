import { createTheme } from '@mui/material/styles';
import { ukUA } from '@mui/material/locale';

// Тема оформлення Session: монохромна «північна» палітра. Графітові й сніжно-сірі
// відтінки, один приглушений крижаний акцент і м'яке світіння лише на активних елементах
// (активний пункт меню, точки статусів, основна кнопка, «Сьогодні» в розкладі, картка
// під курсором). Без градієнтних заливок. Кольори тексту на тлі мають контраст не менше
// 4,5 : 1 (WCAG 2.1 AA) в обох схемах; колір лишається додатковою ознакою поруч із
// текстовою міткою (UX, табл. 5.1).

// Ключ localStorage, у якому зберігається вибір: light, dark або system.
// Той самий ключ читає скрипт в index.html, щоб сторінка не «блимала» під час завантаження.
export const THEME_STORAGE_KEY = 'session.theme';

// Ширина бічної панелі на широких екранах
export const SIDEBAR_WIDTH = 264;

const lightPalette = {
  // Основний колір – акцент для посилань, фокуса й активних позначок.
  // Кнопки з заливкою мають графітовий колір (див. MuiButton нижче).
  primary: { main: '#3D6787', light: '#5E81AC', dark: '#2E5270', contrastText: '#FFFFFF' },
  secondary: { main: '#4C566A', light: '#6B7589', dark: '#3B4252', contrastText: '#FFFFFF' },
  success: { main: '#4A7A3B', light: '#6E9A5C', dark: '#3E6A32', contrastText: '#FFFFFF' },
  warning: { main: '#8A6414', light: '#B4862A', dark: '#7A5810', contrastText: '#FFFFFF' },
  info: { main: '#3D6787', light: '#5E81AC', dark: '#2E5270', contrastText: '#FFFFFF' },
  error: { main: '#A8414B', light: '#BF616A', dark: '#8A3038', contrastText: '#FFFFFF' },
  background: { default: '#E8ECF1', paper: '#FBFCFD' },
  text: { primary: '#2E3440', secondary: '#4C566A' },
  divider: 'rgba(46, 52, 64, 0.10)',
  // Власні токени Session
  sidebar: {
    bg: '#F3F5F8',
    border: 'rgba(46, 52, 64, 0.09)',
    text: '#2E3440',
    muted: '#4C566A',
    // Підпис під назвою сервісу й заголовок «Меню»
    caption: '#5E687A',
    hover: 'rgba(46, 52, 64, 0.05)',
    active: '#FFFFFF',
    activeShadow: '0 1px 2px rgba(46 52 64 / 0.07), 0 8px 20px -10px rgba(94 129 172 / 0.45)',
  },
  // subtle – шапки таблиць, доріжка вкладок, нейтральні банери; inset – елементи всередині
  // панелей; raised – активна вкладка
  surface: { subtle: '#EDF0F4', inset: '#F3F5F8', raised: '#FFFFFF' },
  // Тло панелі сервісу на сторінках входу й реєстрації (темне в обох схемах)
  hero: {
    bg: '#2E3440',
    text: '#ECEFF4',
    muted: '#AEB6C4',
    accent: '#88C0D0',
    markText: '#2E3440',
  },
  // Тіні й світіння. dot – розмиття точки статусу (у світлій схемі світіння немає)
  glow: {
    dot: '0 0 0 0',
    card: '0 1px 2px rgba(46 52 64 / 0.04)',
    cardHover: '0 1px 2px rgba(46 52 64 / 0.05), 0 16px 32px -18px rgba(61 103 135 / 0.45)',
    button: '0 1px 2px rgba(46 52 64 / 0.18), 0 10px 22px -12px rgba(46 52 64 / 0.55)',
    focus: 'rgba(94 129 172 / 0.18)',
    today: 'inset 0 2px 0 rgba(61 103 135 / 0.55)',
    overlay: '0 12px 32px rgba(46 52 64 / 0.16)',
    auth: '0 1px 2px rgba(46 52 64 / 0.05), 0 24px 48px -28px rgba(46 52 64 / 0.35)',
  },
  // Кнопка з заливкою основного кольору
  ink: { main: '#2E3440', hover: '#3B4252', text: '#F3F5F8' },
};

const darkPalette = {
  primary: { main: '#88C0D0', light: '#A8D3DF', dark: '#6FA9BA', contrastText: '#1E232B' },
  secondary: { main: '#D8DEE9', light: '#E5E9F0', dark: '#B6BECC', contrastText: '#1E232B' },
  success: { main: '#A3BE8C', light: '#BFD3AE', dark: '#8AA874', contrastText: '#1E232B' },
  warning: { main: '#EBCB8B', light: '#F2DDB0', dark: '#D9B56A', contrastText: '#2A2110' },
  info: { main: '#88C0D0', light: '#A8D3DF', dark: '#6FA9BA', contrastText: '#1E232B' },
  error: { main: '#D3868E', light: '#E2AEB4', dark: '#BF616A', contrastText: '#2A1215' },
  background: { default: '#20242C', paper: '#2A2F39' },
  text: { primary: '#ECEFF4', secondary: '#B6BECC' },
  divider: 'rgba(216, 222, 233, 0.08)',
  sidebar: {
    bg: '#262B34',
    border: 'rgba(216, 222, 233, 0.07)',
    text: '#ECEFF4',
    muted: '#B6BECC',
    caption: '#99A2B3',
    hover: 'rgba(216, 222, 233, 0.05)',
    active: '#333A46',
    activeShadow:
      'inset 0 1px 0 rgba(255 255 255 / 0.05), 0 0 0 1px rgba(136 192 208 / 0.10), 0 10px 30px -12px rgba(136 192 208 / 0.45)',
  },
  surface: { subtle: '#2F3540', inset: '#30363F', raised: '#3A404C' },
  hero: {
    bg: '#1B1F26',
    text: '#ECEFF4',
    muted: '#AEB6C4',
    accent: '#88C0D0',
    markText: '#2E3440',
  },
  glow: {
    dot: '0 0 9px 1px',
    card: 'inset 0 1px 0 rgba(255 255 255 / 0.03)',
    cardHover:
      'inset 0 1px 0 rgba(255 255 255 / 0.05), 0 0 0 1px rgba(136 192 208 / 0.18), 0 18px 48px -20px rgba(136 192 208 / 0.45)',
    button: '0 0 0 1px rgba(136 192 208 / 0.35), 0 8px 28px -8px rgba(136 192 208 / 0.55)',
    focus: 'rgba(136 192 208 / 0.16)',
    today:
      'inset 0 2px 0 rgba(136 192 208 / 0.7), inset 0 14px 24px -14px rgba(136 192 208 / 0.35)',
    overlay: '0 0 0 1px rgba(216 222 233 / 0.06), 0 24px 60px rgba(0 0 0 / 0.45)',
    auth: 'inset 0 1px 0 rgba(255 255 255 / 0.04), 0 0 0 1px rgba(136 192 208 / 0.06), 0 30px 80px -40px rgba(136 192 208 / 0.35)',
  },
  ink: { main: '#E5E9F0', hover: '#FFFFFF', text: '#232831' },
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
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter Variable", "Roboto", "Helvetica", "Arial", sans-serif',
      h4: { fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1.2 },
      h5: { fontWeight: 600, letterSpacing: '-0.015em' },
      h6: { fontWeight: 600, letterSpacing: '-0.01em' },
      subtitle2: { fontWeight: 600 },
      overline: { fontWeight: 600, letterSpacing: '0.08em', lineHeight: 1.6 },
      // Написи кнопок без великих літер: українські слова капсом читаються гірше
      button: { textTransform: 'none', fontWeight: 550, letterSpacing: 0 },
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
            scrollbarColor: `${theme.vars.palette.divider} transparent`,
          },
          body: { fontFeatureSettings: '"cv11"' },
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
          root: ({ theme }) => ({
            borderRadius: 10,
            paddingInline: 16,
            variants: [
              {
                props: { variant: 'contained' },
                style: {
                  boxShadow: '0 1px 2px rgba(46 52 64 / 0.14)',
                  '&:hover': { boxShadow: '0 1px 2px rgba(46 52 64 / 0.14)' },
                  ...theme.applyStyles('dark', {
                    boxShadow: 'none',
                    '&:hover': { boxShadow: 'none' },
                  }),
                },
              },
              // Основна кнопка – графітова у світлій схемі й «сніжна» зі світінням у темній
              {
                props: { variant: 'contained', color: 'primary' },
                style: {
                  backgroundColor: theme.vars.palette.ink.main,
                  color: theme.vars.palette.ink.text,
                  boxShadow: theme.vars.palette.glow.button,
                  '&:hover': {
                    backgroundColor: theme.vars.palette.ink.hover,
                    boxShadow: theme.vars.palette.glow.button,
                  },
                  '&.Mui-disabled': { boxShadow: 'none' },
                },
              },
              {
                props: { variant: 'outlined' },
                style: {
                  '&:not(.Mui-disabled)': { borderColor: tint(theme, 'secondary', 0.28) },
                  '&:hover': { borderColor: 'currentColor' },
                },
              },
              {
                props: { variant: 'outlined', color: 'primary' },
                style: {
                  color: theme.vars.palette.text.primary,
                  '&:hover': {
                    borderColor: theme.vars.palette.primary.main,
                    backgroundColor: tint(theme, 'primary', 0.06),
                  },
                },
              },
              {
                props: { variant: 'outlined', color: 'error' },
                style: { '&:not(.Mui-disabled)': { borderColor: tint(theme, 'error', 0.4) } },
              },
            ],
          }),
          sizeSmall: { borderRadius: 9, paddingInline: 12 },
          sizeLarge: { borderRadius: 10, paddingBlock: 10 },
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
            boxShadow: theme.vars.palette.glow.card,
            transition: 'border-color .15s ease, box-shadow .2s ease, transform .2s ease',
            // Картка-посилання (CardActionArea) під курсором піднімається й ледь світиться
            '&:has(> .MuiCardActionArea-root):hover': {
              borderColor: tint(theme, 'primary', 0.35),
              boxShadow: theme.vars.palette.glow.cardHover,
              transform: 'translateY(-2px)',
            },
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
            fontWeight: 500,
            borderRadius: 999,
            variants: [
              // «Тональні» мітки: м'яке тло й насичений текст замість суцільної заливки
              ...STATUS_COLORS.map((color) => ({
                props: { variant: 'filled', color },
                style: {
                  backgroundColor: tint(theme, color, 0.16),
                  ...tonalText(theme, color, { backgroundColor: tint(theme, color, 0.12) }),
                  '&.MuiChip-clickable:hover': { backgroundColor: tint(theme, color, 0.24) },
                  '& .MuiChip-icon': { color: 'inherit' },
                },
              })),
              {
                props: { variant: 'filled', color: 'default' },
                style: {
                  backgroundColor: theme.vars.palette.surface.subtle,
                  color: theme.vars.palette.text.secondary,
                },
              },
              {
                props: { variant: 'outlined', color: 'default' },
                style: {
                  borderColor: tint(theme, 'secondary', 0.25),
                  color: theme.vars.palette.text.secondary,
                },
              },
              ...STATUS_COLORS.map((color) => ({
                props: { variant: 'outlined', color },
                style: {
                  borderColor: tint(theme, color, 0.4),
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
        styleOverrides: { root: { fontWeight: 600, letterSpacing: '0.02em' } },
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
              fontWeight: 600,
              letterSpacing: '0.01em',
            },
          }),
        },
      },
      MuiTableRow: {
        styleOverrides: {
          root: ({ theme }) => ({
            '.MuiTableBody-root > &:hover': { backgroundColor: tint(theme, 'primary', 0.05) },
            '.MuiTableBody-root > &:last-of-type > .MuiTableCell-root': { borderBottom: 0 },
          }),
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
          head: { fontWeight: 600 },
        },
      },
      // Вкладки – сегментований перемикач: «доріжка» з активною вкладкою-плашкою
      MuiTabs: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: 0,
            width: 'fit-content',
            maxWidth: '100%',
            padding: 3,
            borderRadius: 12,
            backgroundColor: theme.vars.palette.surface.subtle,
            border: `1px solid ${theme.vars.palette.divider}`,
          }),
          indicator: ({ theme }) => ({
            height: '100%',
            borderRadius: 9,
            backgroundColor: theme.vars.palette.sidebar.active,
            boxShadow: theme.vars.palette.sidebar.activeShadow,
          }),
          scrollButtons: { borderRadius: 9 },
        },
      },
      // Без сірого спалаху (ripple) при натисканні: вкладка лише перемикається,
      // а світла «плитка» плавно переїжджає на обрану
      MuiTab: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: ({ theme }) => ({
            zIndex: 1,
            transition: 'color .2s ease',
            '&:hover': { color: theme.vars.palette.text.primary },
            '&.Mui-focusVisible': { boxShadow: `0 0 0 3px ${theme.vars.palette.glow.focus}` },
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '0.875rem',
            minHeight: 34,
            padding: '6px 18px',
            borderRadius: 9,
            color: theme.vars.palette.text.secondary,
            '&.Mui-selected': { color: theme.vars.palette.text.primary, fontWeight: 600 },
          }),
        },
      },
      // Перемикач «Тиждень / День» – так само, як вкладки
      MuiToggleButtonGroup: {
        styleOverrides: {
          root: ({ theme }) => ({
            padding: 3,
            gap: 2,
            borderRadius: 12,
            backgroundColor: theme.vars.palette.surface.subtle,
            border: `1px solid ${theme.vars.palette.divider}`,
          }),
          grouped: {
            border: 0,
            borderRadius: '9px !important',
            margin: 0,
          },
        },
      },
      // Як у вкладок: без сірого спалаху (ripple) і сірого тла під курсором
      MuiToggleButton: {
        defaultProps: { disableRipple: true },
        styleOverrides: {
          root: ({ theme }) => ({
            textTransform: 'none',
            fontWeight: 500,
            paddingInline: 16,
            color: theme.vars.palette.text.secondary,
            transition: 'background-color .2s ease, box-shadow .2s ease, color .2s ease',
            '&:hover': { backgroundColor: 'transparent', color: theme.vars.palette.text.primary },
            '&.Mui-focusVisible': { boxShadow: `0 0 0 3px ${theme.vars.palette.glow.focus}` },
            '&.Mui-selected, &.Mui-selected:hover': {
              color: theme.vars.palette.text.primary,
              fontWeight: 600,
              backgroundColor: theme.vars.palette.sidebar.active,
              boxShadow: theme.vars.palette.sidebar.activeShadow,
            },
          }),
        },
      },
      // Підпис поля – над рамкою, а не всередині неї
      MuiInputLabel: {
        defaultProps: { shrink: true },
        styleOverrides: {
          root: ({ theme }) => ({
            '&&': {
              position: 'relative',
              transform: 'none',
              marginBottom: 6,
              maxWidth: '100%',
              fontSize: '0.8125rem',
              fontWeight: 500,
              lineHeight: 1.4,
              color: theme.vars.palette.text.secondary,
            },
            '&&.Mui-focused:not(.Mui-error)': { color: theme.vars.palette.text.primary },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: 10,
            backgroundColor: theme.vars.palette.background.paper,
            transition: 'box-shadow .15s ease',
            '&:hover:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': {
              borderColor: tint(theme, 'secondary', 0.4),
            },
            // Фокус: тонка рамка акцентного кольору й м'яке кільце навколо поля
            '&.Mui-focused': { boxShadow: `0 0 0 3px ${theme.vars.palette.glow.focus}` },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1 },
          }),
          notchedOutline: ({ theme }) => ({
            top: 0,
            borderColor: tint(theme, 'secondary', 0.25),
            // Підпис над полем, тому виріз у рамці під нього не потрібен
            '& legend': { display: 'none' },
          }),
        },
      },
      // Підпис групи перемикачів (FormLabel) не змінює колір, коли фокус на перемикачі в групі.
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
          paper: ({ theme }) => ({
            borderRadius: 20,
            boxShadow: theme.vars.palette.glow.overlay,
          }),
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            variants: [
              {
                props: { invisible: false },
                style: { backgroundColor: 'rgba(32 36 44 / 0.5)', backdropFilter: 'blur(3px)' },
              },
            ],
          },
        },
      },
      MuiDialogTitle: {
        styleOverrides: { root: { fontWeight: 600, letterSpacing: '-0.01em' } },
      },
      MuiAlert: {
        styleOverrides: {
          // Інформаційні повідомлення нейтральні (сіре тло, акцентна іконка); успіх, попередження
          // й помилка – з м'яким тлом відповідного кольору
          root: ({ theme }) => ({
            borderRadius: 12,
            alignItems: 'center',
            variants: [
              ...['standard', 'outlined'].map((variant) => ({
                props: { variant, severity: 'info' },
                style: {
                  backgroundColor: theme.vars.palette.surface.subtle,
                  border: `1px solid ${theme.vars.palette.divider}`,
                  color: theme.vars.palette.text.secondary,
                  '& b, & strong': { color: theme.vars.palette.text.primary, fontWeight: 600 },
                  '& .MuiAlert-icon': { color: theme.vars.palette.primary.main },
                },
              })),
              ...['success', 'warning', 'error'].flatMap((color) => [
                {
                  props: { variant: 'outlined', severity: color },
                  style: {
                    backgroundColor: tint(theme, color, 0.08),
                    borderColor: tint(theme, color, 0.35),
                  },
                },
                {
                  props: { variant: 'standard', severity: color },
                  style: {
                    backgroundColor: tint(theme, color, 0.1),
                    border: `1px solid ${tint(theme, color, 0.22)}`,
                    ...tonalText(theme, color),
                    '& .MuiAlert-icon': { color: 'inherit' },
                  },
                },
              ]),
            ],
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
            backgroundColor: '#2E3440',
            color: '#ECEFF4',
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            padding: '6px 10px',
            ...theme.applyStyles('dark', { backgroundColor: '#3B4252' }),
          }),
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.vars.palette.divider}`,
            boxShadow: theme.vars.palette.glow.overlay,
          }),
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          paper: ({ theme }) => ({
            borderRadius: 12,
            border: `1px solid ${theme.vars.palette.divider}`,
            boxShadow: theme.vars.palette.glow.overlay,
          }),
        },
      },
      MuiSkeleton: {
        styleOverrides: { rounded: { borderRadius: 14 } },
      },
      // Увімкнений перемикач: доріжка акцентного кольору (у темній схемі – зі світінням)
      MuiSwitch: {
        styleOverrides: {
          root: { padding: 8 },
          track: { borderRadius: 11, opacity: 0.3 },
          thumb: { boxShadow: 'none', width: 16, height: 16, margin: 2 },
          switchBase: ({ theme }) => ({
            '&.Mui-checked': { color: theme.vars.palette.background.paper },
            '&.Mui-checked + .MuiSwitch-track': {
              opacity: 1,
              backgroundColor: theme.vars.palette.primary.main,
              ...theme.applyStyles('dark', {
                boxShadow: '0 0 14px -2px rgba(136 192 208 / 0.6)',
              }),
            },
          }),
        },
      },
      MuiLink: {
        styleOverrides: { root: { fontWeight: 600, textUnderlineOffset: 3 } },
      },
    },
  },
  ukUA,
);
