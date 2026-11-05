import { Link as RouterLink, useNavigate } from 'react-router';
import {
  Alert,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Link,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useAuth } from '../context/auth-context.js';
import { useForm } from '../hooks/useForm.js';
import { roleHome } from '../utils/roles.js';
import {
  validateEmail,
  validateFullName,
  validateOptionalText,
  validatePassword,
  validateRole,
} from '../utils/validation.js';
import { AuthCard } from './AuthCard.jsx';

const INITIAL = { role: '', fullName: '', email: '', password: '', extra: '' };

const validate = (values) => ({
  role: validateRole(values.role),
  fullName: validateFullName(values.fullName),
  email: validateEmail(values.email),
  password: validatePassword(values.password),
  extra: validateOptionalText(values.extra, 100),
});

// Реєстрація студента або викладача (FR-01). Сервер не повертає токен,
// тому після успіху клієнт виконує вхід і відкриває стартову сторінку ролі.
export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const form = useForm(INITIAL, validate);
  const isTeacher = form.values.role === 'TEACHER';
  const extraField = isTeacher ? 'department' : 'studentGroup';

  const submit = form.handleSubmit(
    async (values) => {
      const user = await register({
        role: values.role,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        password: values.password,
        [extraField]: values.extra.trim() || undefined,
      });
      navigate(roleHome(user), { replace: true });
    },
    (err) => {
      if (err.code === 'EMAIL_ALREADY_EXISTS') {
        form.setServerErrors({ email: err.message });
        return true;
      }
      // Поля department / studentGroup у формі відображаються одним полем
      if (err.code === 'VALIDATION_ERROR') {
        const extra = err.details.find((d) => d.field === extraField);
        if (extra) err.details.push({ field: 'extra', message: extra.message });
      }
      return false;
    },
  );

  const roleError = form.fieldError('role');

  return (
    <AuthCard title="Реєстрація" maxWidth={440}>
      <Stack component="form" spacing={2} onSubmit={submit} noValidate>
        {form.formError && <Alert severity="error">{form.formError}</Alert>}
        <FormControl error={Boolean(roleError)} required>
          <FormLabel id="role-label" sx={{ mb: 1 }}>
            Роль
          </FormLabel>
          <ToggleButtonGroup
            exclusive
            fullWidth
            color="primary"
            aria-labelledby="role-label"
            value={form.values.role}
            onChange={(_e, value) => value && form.setValue('role', value)}
          >
            <ToggleButton value="STUDENT">Студент</ToggleButton>
            <ToggleButton value="TEACHER">Викладач</ToggleButton>
          </ToggleButtonGroup>
          {roleError && <FormHelperText>{roleError}</FormHelperText>}
        </FormControl>
        <TextField {...form.field('fullName')} label="ПІБ" required fullWidth autoComplete="name" />
        <TextField
          {...form.field('email')}
          label="Email"
          type="email"
          required
          fullWidth
          autoComplete="email"
        />
        <TextField
          {...form.field('password', 'Від 8 до 72 символів, щонайменше одна літера та одна цифра')}
          label="Пароль"
          type="password"
          required
          fullWidth
          autoComplete="new-password"
        />
        {form.values.role && (
          <TextField
            {...form.field('extra')}
            label={isTeacher ? 'Кафедра' : 'Академічна група'}
            fullWidth
          />
        )}
        <Button type="submit" variant="contained" size="large" fullWidth loading={form.submitting}>
          Зареєструватися
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          Уже маєте обліковий запис?{' '}
          <Link component={RouterLink} to="/login">
            Увійти
          </Link>
        </Typography>
      </Stack>
    </AuthCard>
  );
}
