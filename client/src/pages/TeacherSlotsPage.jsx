import { useState } from 'react';
import { Link as RouterLink, useParams, useSearchParams } from 'react-router';
import {
  Alert,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  FormControlLabel,
  Link,
  Stack,
  Switch,
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
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import { ApiError } from '../api/client.js';
import { academicApi, subjectsApi, teachersApi } from '../api/index.js';
import { BookingDialog } from '../components/BookingDialog.jsx';
import { DemoChip } from '../components/DemoDataBanner.jsx';
import { Location } from '../components/Location.jsx';
import { PageState } from '../components/PageState.jsx';
import { ScheduleCheckChip } from '../components/ScheduleCheckChip.jsx';
import { UserAvatar } from '../components/UserAvatar.jsx';
import { useAuth } from '../context/auth-context.js';
import { useNotify } from '../context/notification-context.js';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useRequest } from '../hooks/useRequest.js';
import { formatDate, formatTimeRange } from '../utils/datetime.js';
import { topicTemplate } from '../utils/topicTemplate.js';

const teacherNotFound = () => new ApiError(404, 'TEACHER_NOT_FOUND', 'Викладача не знайдено');

// Дані викладача з дисциплінами (GET /api/teachers/:id) і його майбутні вільні слоти
async function loadTeacherPage(id) {
  const [teacher, slots] = await Promise.all([teachersApi.get(id), teachersApi.freeSlots(id)]);
  return { teacher, slots };
}

// Контекст дисципліни для шаблону теми (UX v2, п. 4.3): дисципліна і, за наявності,
// заборгованість або оцінка. Недоступність академічних даних не заважає бронюванню:
// тоді тема заповнюється лише назвою дисципліни.
async function loadSubjectContext({ subjectId, debtId, recordId }) {
  const subject = await subjectsApi.get(subjectId).catch(() => null);
  if (!subject) return null;
  let debt = null;
  let record = null;
  try {
    if (debtId) {
      const { data } = await academicApi.debts('all');
      debt = data.find((item) => item.id === debtId && item.subject.id === subjectId) ?? null;
    } else if (recordId) {
      const { data } = await academicApi.records();
      record = data.find((item) => item.id === recordId && item.subject.id === subjectId) ?? null;
    }
  } catch {
    // Академічні дані недоступні – лише назва дисципліни
  }
  return { subject: { id: subject.id, name: subject.name }, debt, record };
}

function contextText({ debt, record }) {
  if (debt) return `${debt.debtType}${debt.description ? ` (${debt.description})` : ''}`;
  if (record) return `${record.controlType}, ${record.score} балів`;
  return '';
}

// Майбутні вільні слоти викладача (FR-14), бронювання студентом (FR-15), перевірка накладок
// з розкладом занять (FR-34, FR-35) і запис щодо дисципліни (FR-33)
export default function TeacherSlotsPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const id = Number(params.id);
  const subjectParam = Number(search.get('subjectId'));
  const subjectId = Number.isInteger(subjectParam) && subjectParam > 0 ? subjectParam : null;
  const debtId = search.get('debtId') || null;
  const recordId = search.get('recordId') || null;
  const { user } = useAuth();
  const notify = useNotify();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const canBook = user.role === 'STUDENT';
  const [selected, setSelected] = useState(null);
  const [onlyWithoutConflicts, setOnlyWithoutConflicts] = useState(true);

  const { data, loading, error, reload } = useRequest(
    () =>
      Number.isInteger(id) && id > 0 ? loadTeacherPage(id) : Promise.reject(teacherNotFound()),
    String(id),
    'teacher-slots',
  );
  const contextRequest = useRequest(
    () =>
      canBook && subjectId
        ? loadSubjectContext({ subjectId, debtId, recordId })
        : Promise.resolve(null),
    `${subjectId ?? ''}|${debtId ?? ''}|${recordId ?? ''}`,
    'booking-context',
  );
  const context = contextRequest.data;

  const teacher = data?.teacher;
  usePageTitle(teacher?.fullName ?? 'Слоти викладача');
  const slots = data?.slots ?? [];

  // Перевірка розкладу виконується лише для студента; UNAVAILABLE – обліковий запис
  // не зіставлено або джерело недоступне (FR-36)
  const checkUnavailable = canBook && slots.some((slot) => slot.scheduleCheck === 'UNAVAILABLE');
  const showCheck = canBook && slots.length > 0 && !checkUnavailable;
  const conflictCount = showCheck
    ? slots.filter((slot) => slot.scheduleCheck === 'CONFLICT').length
    : 0;
  const hideConflicts = showCheck && onlyWithoutConflicts;
  const visibleSlots = hideConflicts
    ? slots.filter((slot) => slot.scheduleCheck !== 'CONFLICT')
    : slots;

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

  const allHidden = slots.length > 0 && visibleSlots.length === 0;

  return (
    <>
      <Link
        component={RouterLink}
        to={subjectId ? `/teachers?subjectId=${subjectId}` : '/teachers'}
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2 }}
      >
        <ArrowBackIcon fontSize="small" /> Викладачі
      </Link>

      {teacher && (
        <Stack sx={{ mb: 3 }} spacing={1}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <UserAvatar user={teacher} size={64} sx={{ display: { xs: 'none', sm: 'flex' } }} />
            <div>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontSize: { xs: '1.75rem', sm: '2.25rem' } }}
              >
                {teacher.fullName}
              </Typography>
              <Typography color="text.secondary">
                {teacher.department || 'Кафедру не вказано'}
              </Typography>
            </div>
          </Stack>
          {teacher.subjects?.length > 0 && (
            <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
              {teacher.subjects.map((s) => (
                <Chip
                  key={s.id}
                  size="small"
                  label={s.name}
                  color={s.id === subjectId ? 'primary' : 'default'}
                  variant={s.id === subjectId ? 'filled' : 'outlined'}
                />
              ))}
            </Stack>
          )}
          {context && (
            <Alert severity="info">
              Запис щодо дисципліни «{context.subject.name}»
              {contextText(context) ? `: ${contextText(context)}` : ''}. Тему буде заповнено
              автоматично.
            </Alert>
          )}
        </Stack>
      )}

      {teacher && (
        <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
          Вільні слоти
        </Typography>
      )}

      {checkUnavailable && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Розклад не перевірено — академічні дані недоступні. Бронювання доступне.
        </Alert>
      )}
      {showCheck && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 2, alignItems: { sm: 'center' } }}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={onlyWithoutConflicts}
                  onChange={(e) => setOnlyWithoutConflicts(e.target.checked)}
                />
              }
              label="Лише без накладок"
            />
            <DemoChip />
          </Stack>
          {hideConflicts && conflictCount > 0 && !allHidden && (
            <Typography variant="body2" color="text.secondary">
              Приховано {conflictCount} {slotsWord(conflictCount)}, що{' '}
              {isSingular(conflictCount) ? 'перетинається' : 'перетинаються'} з вашими заняттями.{' '}
              <Link component="button" type="button" onClick={() => setOnlyWithoutConflicts(false)}>
                Показати
              </Link>
            </Typography>
          )}
        </Stack>
      )}

      <PageState
        loading={loading && !data}
        error={error}
        onRetry={error?.code === 'TEACHER_NOT_FOUND' ? undefined : reload}
        empty={visibleSlots.length === 0}
        emptyText={
          allHidden
            ? 'Усі вільні слоти перетинаються з вашими заняттями'
            : 'У викладача немає вільних слотів'
        }
        emptyIcon={EventBusyOutlinedIcon}
        emptyAction={
          allHidden ? (
            <Button variant="outlined" onClick={() => setOnlyWithoutConflicts(false)}>
              Показати
            </Button>
          ) : undefined
        }
      />

      {visibleSlots.length > 0 &&
        (isMobile ? (
          <Stack spacing={2}>
            {visibleSlots.map((slot) => (
              <Card key={slot.id} variant="outlined">
                <CardContent sx={{ pb: canBook ? 0 : 2 }}>
                  <Typography sx={{ fontWeight: 600 }}>{formatDate(slot.startAt)}</Typography>
                  <Typography>{formatTimeRange(slot.startAt, slot.endAt)}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    <Location value={slot.location} />
                  </Typography>
                  {showCheck && (
                    <Stack sx={{ mt: 1, alignItems: 'flex-start' }}>
                      <ScheduleCheckChip
                        scheduleCheck={slot.scheduleCheck}
                        conflicts={slot.conflicts}
                      />
                    </Stack>
                  )}
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
                  {showCheck && <TableCell>Розклад</TableCell>}
                  {canBook && <TableCell align="right">Дія</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleSlots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell>{formatDate(slot.startAt)}</TableCell>
                    <TableCell>{formatTimeRange(slot.startAt, slot.endAt)}</TableCell>
                    <TableCell>
                      <Location value={slot.location} />
                    </TableCell>
                    {showCheck && (
                      <TableCell>
                        <ScheduleCheckChip
                          scheduleCheck={slot.scheduleCheck}
                          conflicts={slot.conflicts}
                        />
                      </TableCell>
                    )}
                    {canBook && <TableCell align="right">{bookButton(slot)}</TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      {canBook && (
        <BookingDialog
          key={selected?.id ?? 'none'}
          open={Boolean(selected)}
          slot={selected}
          teacher={teacher}
          subject={context?.subject ?? null}
          initialTopic={context ? topicTemplate(context) : ''}
          onClose={handleClose}
          onBooked={handleBooked}
        />
      )}
    </>
  );
}

const isSingular = (count) => count % 10 === 1 && count % 100 !== 11;

// «1 слот», «2 слоти», «5 слотів»
function slotsWord(count) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (isSingular(count)) return 'слот';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'слоти';
  return 'слотів';
}
