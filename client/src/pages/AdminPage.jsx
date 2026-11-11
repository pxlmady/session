import { useState } from 'react';
import {
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { adminApi } from '../api/index.js';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../context/auth-context.js';
import { useNotify } from '../context/notification-context.js';
import { useRequest } from '../hooks/useRequest.js';
import { DemoChip } from '../components/DemoDataBanner.jsx';
import { formatDate } from '../utils/datetime.js';
import { BOOKING_STATUS, ROLE_LABELS } from '../utils/labels.js';

function StatCard({ label, value }) {
  return (
    <Card variant="outlined" sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h4" component="p">
          {value ?? 0}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

function Stats() {
  const { data, loading, error, reload } = useRequest(() => adminApi.stats(), '', 'admin-stats');
  const state = <PageState loading={loading && !data} error={error} onRetry={reload} />;
  if (!data) return state;

  const cards = [
    ['Студентів', data.usersByRole?.STUDENT],
    ['Викладачів', data.usersByRole?.TEACHER],
    ['Адміністраторів', data.usersByRole?.ADMIN],
    ['Слотів', data.slotsTotal],
    ...Object.entries(BOOKING_STATUS).map(([status, meta]) => [
      meta.label,
      data.bookingsByStatus?.[status],
    ]),
  ];

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        {cards.map(([label, value]) => (
          <Grid key={label} size={{ xs: 6, sm: 4, md: 3 }}>
            <StatCard label={label} value={value} />
          </Grid>
        ))}
      </Grid>
      <Typography variant="subtitle1" component="h3">
        Записи за викладачами
      </Typography>
      <TableContainer component={Card} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Викладач</TableCell>
              <TableCell align="right">Записів</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(data.bookingsByTeacher ?? []).map((row) => (
              <TableRow key={row.teacherId}>
                <TableCell>{row.fullName}</TableCell>
                <TableCell align="right">{row.count}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}

// Назва постачальника академічних даних для адміністратора
const PROVIDER_NAMES = { mock: 'MockAcademicProvider' };

// Стан академічної інтеграції (FR-40): постачальник, демонстраційний режим, доступність,
// актуальність даних і кількість зіставлень. Зіставлення в інтерфейсі не редагуються.
function AcademicIntegration() {
  const { data, loading, error, reload } = useRequest(() => adminApi.stats(), '', 'admin-stats');
  if (!data) return <PageState loading={loading} error={error} onRetry={reload} skeletonRows={1} />;
  const academic = data.academic;
  if (!academic) return null;

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1, mb: 2 }}
        >
          <Typography sx={{ fontWeight: 600 }}>
            {PROVIDER_NAMES[academic.provider] ?? academic.provider}
          </Typography>
          {academic.isDemo !== false && <DemoChip />}
          <Chip
            size="small"
            color={academic.available ? 'success' : 'error'}
            label={academic.available ? 'Доступний' : 'Недоступний'}
          />
        </Stack>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          {[
            ['Дисциплін', academic.subjectsTotal],
            ['Зіставлених студентів', academic.linkedStudents],
            ['Зіставлених викладачів', academic.linkedTeachers],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 12, sm: 4 }}>
              <Typography variant="h5" component="p">
                {value ?? 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </Grid>
          ))}
        </Grid>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <b>Дані станом на:</b> {academic.dataAsOf ? formatDate(academic.dataAsOf) : '—'}
        </Typography>
        <Alert severity="info" variant="outlined">
          Session не синхронізується з системою університету: академічні дані надає тестовий
          постачальник, зіставлення створюються під час заповнення бази (seed).
        </Alert>
      </CardContent>
    </Card>
  );
}

function Users() {
  const { user: me } = useAuth();
  const notify = useNotify();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const { data, loading, error, reload } = useRequest(() => adminApi.users(), '', 'admin-users');
  const [change, setChange] = useState(null); // { user, role }
  const [saving, setSaving] = useState(false);
  const [changeError, setChangeError] = useState('');

  const users = data ?? [];

  const confirmChange = async () => {
    setSaving(true);
    try {
      await adminApi.changeRole(change.user.id, change.role);
      notify('Роль користувача змінено');
      setChange(null);
    } catch (err) {
      setChangeError(err.message);
    } finally {
      setSaving(false);
      reload();
    }
  };

  const roleSelect = (u) => (
    <Select
      size="small"
      value={u.role}
      disabled={u.id === me.id}
      inputProps={{ 'aria-label': `Роль користувача ${u.fullName}` }}
      onChange={(e) => {
        setChangeError('');
        setChange({ user: u, role: e.target.value });
      }}
    >
      {Object.entries(ROLE_LABELS).map(([role, label]) => (
        <MenuItem key={role} value={role}>
          {label}
        </MenuItem>
      ))}
    </Select>
  );

  return (
    <>
      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        empty={users.length === 0}
        emptyText="Користувачів не знайдено"
      />
      {users.length > 0 &&
        (isMobile ? (
          <Stack spacing={2}>
            {users.map((u) => (
              <Card key={u.id} variant="outlined">
                <CardContent>
                  <Typography sx={{ fontWeight: 600 }}>{u.fullName}</Typography>
                  <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                    {u.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    {u.department || u.studentGroup || '—'}
                  </Typography>
                  {roleSelect(u)}
                </CardContent>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Card} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ПІБ</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Кафедра / група</TableCell>
                  <TableCell>Роль</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>{u.fullName}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{u.department || u.studentGroup || '—'}</TableCell>
                    <TableCell>{roleSelect(u)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}
      <ConfirmDialog
        open={Boolean(change)}
        title="Змінити роль?"
        text={
          change
            ? `Змінити роль користувача ${change.user.fullName} з «${ROLE_LABELS[change.user.role]}» на «${ROLE_LABELS[change.role]}»?`
            : ''
        }
        confirmLabel="Змінити"
        loading={saving}
        error={changeError}
        onConfirm={confirmChange}
        onClose={() => setChange(null)}
      />
    </>
  );
}

// Адміністрування (FR-25, FR-26, FR-40): статистика, стан академічної інтеграції
// і керування ролями користувачів
export default function AdminPage() {
  return (
    <>
      <PageHeader title="Адміністрування" />
      <Stack spacing={4}>
        <section>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Статистика
          </Typography>
          <Stats />
        </section>
        <section>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Академічна інтеграція
          </Typography>
          <AcademicIntegration />
        </section>
        <section>
          <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
            Користувачі
          </Typography>
          <Users />
        </section>
      </Stack>
    </>
  );
}
