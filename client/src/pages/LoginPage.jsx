import { Link as RouterLink, useNavigate } from 'react-router';
import { Alert, Button, Link, Stack, TextField, Typography } from '@mui/material';
import { useAuth } from '../context/auth-context.js';
import { useForm } from '../hooks/useForm.js';
import { roleHome } from '../utils/roles.js';
import { validateEmail } from '../utils/validation.js';
import { AuthCard } from './AuthCard.jsx';

const validate = (values) => ({
  email: validateEmail(values.email),
  password: values.password ? '' : 'Вкажіть пароль',
});

// Вхід (FR-02); після успіху – стартова сторінка ролі
export default function LoginPage() {
  const { login, sessionMessage } = useAuth();
  const navigate = useNavigate();
  const form = useForm({ email: '', password: '' }, validate);

  const submit = form.handleSubmit(async ({ email, password }) => {
    const user = await login({ email: email.trim(), password });
    navigate(roleHome(user), { replace: true });
  });

  return (
    <AuthCard title="Вхід до Session">
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {sessionMessage && !form.formError && <Alert severity="info">{sessionMessage}</Alert>}
        {form.formError && <Alert severity="error">{form.formError}</Alert>}
        <TextField
          {...form.field('email')}
          label="Email"
          type="email"
          autoComplete="email"
          required
          fullWidth
          autoFocus
        />
        <TextField
          {...form.field('password')}
          label="Пароль"
          type="password"
          autoComplete="current-password"
          required
          fullWidth
        />
        <Button type="submit" variant="contained" size="large" fullWidth loading={form.submitting}>
          Увійти
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          Немає облікового запису?{' '}
          <Link component={RouterLink} to="/register">
            Зареєструватися
          </Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
