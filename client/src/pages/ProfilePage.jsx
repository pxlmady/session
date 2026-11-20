import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { usersApi } from '../api/index.js';
import { AvatarPattern } from '../components/AvatarPattern.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { UserAvatar } from '../components/UserAvatar.jsx';
import { useAuth } from '../context/auth-context.js';
import { useNotify } from '../context/notification-context.js';
import { useForm } from '../hooks/useForm.js';
import { ROLE_LABELS } from '../utils/labels.js';
import { validateFullName, validateOptionalText } from '../utils/validation.js';

// Додаткове поле профілю залежно від ролі; адміністратор має лише ПІБ
const EXTRA_FIELD = {
  STUDENT: { name: 'studentGroup', label: 'Академічна група' },
  TEACHER: { name: 'department', label: 'Кафедра' },
};

const validate = (values) => ({
  fullName: validateFullName(values.fullName),
  extra: validateOptionalText(values.extra, 100),
});

// Перегляд (FR-06, дані GET /api/auth/me) і редагування профілю (FR-07)
export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const notify = useNotify();
  const extra = EXTRA_FIELD[user.role];
  const initial = { fullName: user.fullName, extra: (extra && user[extra.name]) ?? '' };
  const form = useForm(initial, validate);
  const changed =
    form.values.fullName.trim() !== initial.fullName ||
    (extra && form.values.extra.trim() !== initial.extra);

  const submit = form.handleSubmit(
    async (values) => {
      const data = { fullName: values.fullName.trim() };
      if (extra) data[extra.name] = values.extra.trim();
      const { user: updated } = await usersApi.updateMe(data);
      updateUser(updated);
      form.reset({ fullName: updated.fullName, extra: (extra && updated[extra.name]) ?? '' });
      notify('Профіль збережено');
    },
    (err) => {
      if (extra && err.code === 'VALIDATION_ERROR') {
        const detail = err.details.find((d) => d.field === extra.name);
        if (detail) err.details.push({ field: 'extra', message: detail.message });
      }
      return false;
    },
  );

  return (
    <>
      <PageHeader title="Профіль" />
      <Card variant="outlined" sx={{ maxWidth: 640, overflow: 'hidden' }}>
        {/* Шапка профілю: смуга з тонкими колами, далі аватар, ПІБ і роль */}
        <AvatarPattern user={user} />
        <CardContent sx={{ p: { xs: 2.5, sm: 4 }, pt: '0 !important' }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            sx={{ alignItems: 'flex-start', mb: 3 }}
          >
            <UserAvatar
              user={user}
              size={84}
              sx={(theme) => ({
                mt: '-44px',
                border: 4,
                borderColor: 'background.paper',
                boxSizing: 'content-box',
                boxShadow: `0 0 0 1px ${theme.vars.palette.divider}`,
                ...theme.applyStyles('dark', {
                  boxShadow: `0 0 0 1px ${theme.vars.palette.divider}, 0 0 30px -6px rgba(136 192 208 / 0.45)`,
                }),
              })}
            />
            <Box sx={{ minWidth: 0, pt: { sm: 1.5 } }}>
              <Typography variant="h6" component="p" sx={{ wordBreak: 'break-word' }}>
                {user.fullName}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                <Chip size="small" color="primary" label={ROLE_LABELS[user.role]} />
                <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                  {user.email}
                </Typography>
              </Stack>
            </Box>
          </Stack>
          <Divider sx={{ mb: 3 }} />
          <Stack component="form" spacing={2} onSubmit={submit} noValidate>
            {form.formError && <Alert severity="error">{form.formError}</Alert>}
            <TextField {...form.field('fullName')} label="ПІБ" required fullWidth />
            {extra && <TextField {...form.field('extra')} label={extra.label} fullWidth />}
            <Box>
              <Button
                type="submit"
                variant="contained"
                disabled={!changed}
                loading={form.submitting}
              >
                Зберегти
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </>
  );
}
