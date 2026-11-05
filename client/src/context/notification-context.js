import { createContext, useContext } from 'react';

export const NotificationContext = createContext(() => {});

// notify(text, severity = 'success', action) – спливаюче повідомлення про результат дії;
// action – необов'язкова кнопка-посилання { label, to }
export function useNotify() {
  return useContext(NotificationContext);
}
