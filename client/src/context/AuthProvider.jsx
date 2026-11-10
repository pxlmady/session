import { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/index.js';
import { getToken, setToken, setUnauthorizedHandler } from '../api/client.js';
import { clearRequestCache } from '../hooks/useRequest.js';
import { AuthContext } from './auth-context.js';

// Стан автентифікації: 'checking' – перевірка збереженого токена, 'guest', 'authenticated'
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState(() => (getToken() ? 'checking' : 'guest'));
  const [sessionMessage, setSessionMessage] = useState('');

  // Кешовані дані сторінок належать попередньому користувачу, тому кеш очищується
  const logout = useCallback((message = '') => {
    clearRequestCache();
    setToken(null);
    setUser(null);
    setStatus('guest');
    setSessionMessage(message);
  }, []);

  // Відповідь 401 на будь-який захищений запит означає завершення сеансу
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Сеанс завершено, увійдіть знову'));
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Під час запуску застосунку перевіряється збережений токен (GET /api/auth/me)
  useEffect(() => {
    if (!getToken()) return;
    let active = true;
    authApi
      .me()
      .then(({ user: current }) => {
        if (!active) return;
        setUser(current);
        setStatus('authenticated');
      })
      .catch((err) => {
        if (!active) return;
        if (err.status === 401) {
          logout();
        } else {
          // Сервер недоступний: токен не видаляється, користувач може повторити вхід
          setToken(null);
          setStatus('guest');
          setSessionMessage(err.message);
        }
      });
    return () => {
      active = false;
    };
  }, [logout]);

  const login = useCallback(async (credentials) => {
    const result = await authApi.login(credentials);
    clearRequestCache();
    setToken(result.token);
    setUser(result.user);
    setStatus('authenticated');
    setSessionMessage('');
    return result.user;
  }, []);

  // Сервер після реєстрації не повертає токен, тому клієнт одразу виконує вхід
  const register = useCallback(
    async (data) => {
      await authApi.register(data);
      return login({ email: data.email, password: data.password });
    },
    [login],
  );

  const value = useMemo(
    () => ({
      user,
      status,
      sessionMessage,
      login,
      register,
      logout,
      updateUser: setUser,
    }),
    [user, status, sessionMessage, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
