// Стартова сторінка ролі (ТЗ, п. 13.2): студент – /teachers, викладач – /slots, адміністратор – /admin
const ROLE_HOME = {
  STUDENT: '/teachers',
  TEACHER: '/slots',
  ADMIN: '/admin',
};

export function roleHome(user) {
  return user ? (ROLE_HOME[user.role] ?? '/profile') : '/login';
}

// Пункти навігаційного меню за ролями (UX, табл. 2.2)
const MENU = {
  STUDENT: [
    { label: 'Викладачі', to: '/teachers' },
    { label: 'Мої записи', to: '/my-bookings' },
    { label: 'Профіль', to: '/profile' },
  ],
  TEACHER: [
    { label: 'Мої слоти', to: '/slots' },
    { label: 'Мої записи', to: '/my-bookings' },
    { label: 'Викладачі', to: '/teachers' },
    { label: 'Профіль', to: '/profile' },
  ],
  ADMIN: [
    { label: 'Адміністрування', to: '/admin' },
    { label: 'Викладачі', to: '/teachers' },
    { label: 'Профіль', to: '/profile' },
  ],
};

export function menuItems(user) {
  return MENU[user?.role] ?? [];
}
