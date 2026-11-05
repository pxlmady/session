import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../context/auth-context.js';
import { roleHome } from '../utils/roles.js';

// Перевірка входу і ролі (ТЗ, п. 13.2): гість → /login; недоступна для ролі сторінка →
// стартова сторінка ролі. Сервер однаково повертає 403, тому це лише зручність навігації.
export function ProtectedRoute({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user)} replace />;
  return <Outlet />;
}

// Сторінки входу й реєстрації доступні лише гостю
export function GuestRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={roleHome(user)} replace />;
  return <Outlet />;
}
