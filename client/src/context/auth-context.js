import { createContext, useContext } from 'react';

export const AuthContext = createContext(null);

// Поточний користувач і дії автентифікації (login, register, logout, updateUser)
export function useAuth() {
  return useContext(AuthContext);
}
