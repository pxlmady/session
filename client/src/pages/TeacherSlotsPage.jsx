import { useState } from 'react';
import { Link as RouterLink, useLocation, useParams } from 'react-router';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Link,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { teachersApi } from '../api/index.js';
import { BookingDialog } from '../components/BookingDialog.jsx';
import { Location } from '../components/Location.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../context/auth-context.js';
import { useNotify } from '../context/notification-context.js';
import { useRequest } from '../hooks/useRequest.js';
import { ApiError } from '../api/client.js';
import { formatDate, formatTimeRange } from '../utils/datetime.js';

// Дані викладача передаються зі списку; за прямим посиланням – беруться з GET /api/teachers
async function loadTeacherPage(id, teacherFromList) {
  const [teacher, slots] = await Promise.all([
    teacherFromList?.id === id
      ? teacherFromList
      : teachersApi.list().then((list) => list.find((t) => t.id === id) ?? null),
    teachersApi.freeSlots(id),
  ]);
  if (!teacher) throw new ApiError(404, 'TEACHER_NOT_FOUND', 'Викладача не знайдено');
  return { teacher, slots };
}

// Майбутні вільні слоти викладача (FR-14) і бронювання студентом (FR-15)
export default function TeacherSlotsPage() {
  const params = useParams();
  const id = Number(params.id);
  const { state } = useLocation();
  const { user } = useAuth();
  const notify = useNotify();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const canBook = user.role === 'STUDENT';
  const [selected, setSelected] = useState(null);

  const { data, loading, error, reload } = useRequest(
    () =>
      Number.isInteger(id) && id > 0
        ? loadTeacherPage(id, state?.teacher)
        : Promise.reject(new ApiError(404, 'TEACHER_NOT_FOUND', 'Викладача не знайдено')),
    String(id),
  );
  const teacher = data?.teacher;
  const slots = data?.slots ?? [];

  const handleBooked = () => {
    setSelected(null);
    reload();
    notify('Запис створено. Очікує підтвердження викладача', 'success', {
      label: 'Мої записи',
      to: '/my-bookings',
    });
  };

  const handleClose = (changed) => {
    setSelected(null);
    if (changed) reload();
  };

  const bookButton = (slot) => (
    <Button variant="contained" size="small" onClick={() => setSelected(slot)}>
      Забронювати
    </Button>
  );

  return (
    <>
      <Link
        component={RouterLink}
        to="/teachers"
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2 }}
      >
        <ArrowBackIcon fontSize="small" /> Викладачі
      </Link>

      {teacher && (
        <Stack sx={{ mb: 3 }}>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}
          >
            {teacher.fullName}
          </Typography>
          <Typography color="text.secondary">
            {teacher.department || 'Кафедру не вказано'}
          </Typography>
        </Stack>
      )}
      {teacher && (
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Вільні слоти
        </Typography>
      )}

      <PageState
        loading={loading && !data}
        error={error}
        onRetry={error?.code === 'TEACHER_NOT_FOUND' ? undefined : reload}
        empty={slots.length === 0}
        emptyText="У викладача немає вільних слотів"
      />

      {slots.length > 0 &&
        (isMobile ? (
          <Stack spacing={2}>
            {slots.map((slot) => (
              <Card key={slot.id} variant="outlined">
                <CardContent sx={{ pb: canBook ? 0 : 2 }}>
                  <Typography sx={{ fontWeight: 600 }}>{formatDate(slot.startAt)}</Typography>
                  <Typography>{formatTimeRange(slot.startAt, slot.endAt)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    <Location value={slot.location} />
                  </Typography>
                </CardContent>
                {canBook && <CardActions sx={{ px: 2, pb: 2 }}>{bookButton(slot)}</CardActions>}
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Card} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Час</TableCell>
                  <TableCell>Місце</TableCell>
                  {canBook && <TableCell align="right">Дія</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>{formatDate(slot.startAt)}</TableCell>
                    <TableCell>{formatTimeRange(slot.startAt, slot.endAt)}</TableCell>
                    <TableCell>
                      <Location value={slot.location} />
                    </TableCell>
                    {canBook && <TableCell align="right">{bookButton(slot)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {canBook && (
        <BookingDialog
          open={Boolean(selected)}
          slot={selected}
          teacher={teacher}
          onClose={handleClose}
          onBooked={handleBooked}
        />
      )}
    </>
  );
}
