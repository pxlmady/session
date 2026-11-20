import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { formatDate, formatTimeRange, isFuture } from '../utils/datetime.js';
import { Location } from './Location.jsx';
import { StatusChip } from './StatusChip.jsx';
import { UserAvatar } from './UserAvatar.jsx';

// Дії із записом залежно від статусу, ролі та часу (UX, табл. 5.2)
// Після завершення підтвердженої консультації викладач може один раз зафіксувати її результат
function bookingActions(booking, role) {
  if (!isFuture(booking.slot.startAt)) {
    const finished = !isFuture(booking.slot.endAt);
    const canComplete =
      role === 'TEACHER' && finished && booking.status === 'CONFIRMED' && !booking.conductedAt;
    return canComplete ? ['complete'] : [];
  }
  if (booking.status === 'PENDING') {
    return role === 'TEACHER' ? ['confirm', 'reject', 'cancel'] : ['cancel'];
  }
  if (booking.status === 'CONFIRMED') return ['cancel'];
  return [];
}

// Рядок відомостей запису: підпис ліворуч, значення праворуч (дві колонки сітки FieldGrid)
function Field({ label, children }) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" component="dt">
        {label}
      </Typography>
      <Typography variant="body2" component="dd" sx={{ m: 0, wordBreak: 'break-word' }}>
        {children}
      </Typography>
    </>
  );
}

// Картка запису: час, статус, викладач (для студента) або студент (для викладача),
// місце, дисципліна (FR-39, якщо запис створено з контекстом дисципліни), тема та доступні дії
export function BookingCard({ booking, role, onAction, busy }) {
  const { slot, student } = booking;
  const actions = bookingActions(booking, role);
  const teacher = slot.teacher;

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: actions.length ? 2 : 2.5, px: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1.75 }}
        >
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.05rem' }}>
            {formatDate(slot.startAt)} · {formatTimeRange(slot.startAt, slot.endAt)}
          </Typography>
          <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
            <StatusChip entity="booking" status={booking.status} />
            {booking.conductedAt && (
              <Chip
                size="small"
                variant="outlined"
                color="success"
                icon={<TaskAltIcon />}
                label="Проведено"
              />
            )}
          </Stack>
        </Stack>
        <Box
          component="dl"
          sx={{
            m: 0,
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'minmax(80px, max-content) minmax(0, 1fr)' },
            columnGap: 2,
            rowGap: { xs: 0.25, sm: 0.75 },
            alignItems: 'center',
            '& dd + dt': { mt: { xs: 1, sm: 0 } },
          }}
        >
          <Field label={role === 'TEACHER' ? 'Студент' : 'Викладач'}>
            <Stack component="span" direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <UserAvatar user={role === 'TEACHER' ? student : teacher} size={24} />
              <Box component="span" sx={{ minWidth: 0 }}>
                {role === 'TEACHER'
                  ? [student.fullName, student.studentGroup, student.email]
                      .filter(Boolean)
                      .join(', ')
                  : `${teacher.fullName}${teacher.department ? `, ${teacher.department}` : ''}`}
              </Box>
            </Stack>
          </Field>
          <Field label="Місце">
            <Location value={slot.location} />
          </Field>
          {booking.subject && <Field label="Дисципліна">{booking.subject.name}</Field>}
          <Field label="Тема">{booking.topic}</Field>
          {booking.teacherNote && (
            <Field label="Рекомендація викладача">{booking.teacherNote}</Field>
          )}
        </Box>
        {booking.gradeEntry && (
          <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
            Оцінка за результатом консультації: {booking.gradeEntry.controlType},{' '}
            {booking.gradeEntry.score} балів ({booking.gradeEntry.nationalGrade}),{' '}
            {booking.gradeEntry.semester} семестр.
          </Alert>
        )}
        {booking.debtClosure && (
          <Alert severity="success" variant="outlined" sx={{ mt: 1.5 }}>
            Заборгованість закрито за результатом консультації: {booking.debtClosure.debtTitle}.
          </Alert>
        )}
      </CardContent>
      {actions.length > 0 && (
        <CardActions
          sx={{
            mx: 3,
            px: 0,
            pt: 1.75,
            pb: 2.5,
            flexWrap: 'wrap',
            gap: 1,
            borderTop: 1,
            borderColor: 'divider',
          }}
        >
          {actions.includes('complete') && (
            <Button
              variant="contained"
              disabled={busy}
              onClick={() => onAction('complete', booking)}
            >
              Зафіксувати результат
            </Button>
          )}
          {actions.includes('confirm') && (
            <Button
              variant="contained"
              color="success"
              disabled={busy}
              onClick={() => onAction('confirm', booking)}
            >
              Підтвердити
            </Button>
          )}
          {actions.includes('reject') && (
            <Button variant="outlined" disabled={busy} onClick={() => onAction('reject', booking)}>
              Відхилити
            </Button>
          )}
          {actions.includes('cancel') && (
            <Button
              variant={role === 'TEACHER' && actions.length > 1 ? 'text' : 'outlined'}
              color="error"
              disabled={busy}
              onClick={() => onAction('cancel', booking)}
              sx={{ ml: '0 !important' }}
            >
              {role === 'STUDENT' ? 'Скасувати запис' : 'Скасувати'}
            </Button>
          )}
        </CardActions>
      )}
    </Card>
  );
}
