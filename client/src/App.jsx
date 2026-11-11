import { Navigate, Route, Routes } from 'react-router';
import { Box, CircularProgress } from '@mui/material';
import { AppLayout } from './components/AppLayout.jsx';
import { GuestRoute, ProtectedRoute } from './components/ProtectedRoute.jsx';
import { useAuth } from './context/auth-context.js';
import AcademicPage from './pages/AcademicPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MyBookingsPage from './pages/MyBookingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import SchedulePage from './pages/SchedulePage.jsx';
import SlotsPage from './pages/SlotsPage.jsx';
import SubjectPage from './pages/SubjectPage.jsx';
import TeacherSlotsPage from './pages/TeacherSlotsPage.jsx';
import TeachersPage from './pages/TeachersPage.jsx';
import { roleHome } from './utils/roles.js';

// Маршрути клієнтської частини (ТЗ, п. 13.2; UX v2, табл. 2.1) і доступ за ролями (ТЗ, табл. 4.1)
export default function App() {
  const { user, status } = useAuth();

  // Перевірка збереженого токена під час запуску застосунку
  if (status === 'checking') {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress aria-label="Завантаження" />
      </Box>
    );
  }

  return (
    <Routes>
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/teachers" element={<TeachersPage />} />
          <Route path="/teachers/:id" element={<TeacherSlotsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Академічні сторінки студента (FR-28 – FR-33, FR-38) */}
          <Route element={<ProtectedRoute roles={['STUDENT']} />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/academic" element={<AcademicPage />} />
            <Route path="/subjects/:id" element={<SubjectPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['STUDENT', 'TEACHER']} />}>
            <Route path="/my-bookings" element={<MyBookingsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['TEACHER']} />}>
            <Route path="/slots" element={<SlotsPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to={roleHome(user)} replace />} />
    </Routes>
  );
}
