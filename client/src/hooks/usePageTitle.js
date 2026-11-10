import { useEffect } from 'react';

// Заголовок вкладки браузера: «<Сторінка> · Session»
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Session` : 'Session — запис на консультації';
  }, [title]);
}
