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

// Колір смужки ліворуч на картці – додаткова ознака статусу поруч із міткою
const STATUS_ACCENT = { PENDING: 'warning', CONFIRMED: 'success' };

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

function Field({ label, children }) {
  return (
    <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
      <b>{label}:</b> {children}
    </Typography>
  );
}

// Картка запису: час, статус, викладач (для студента) або студент (для викладача),
// місце, дисципліна (FR-39, якщо запис створено з контекстом дисципліни), тема та доступні дії
export function BookingCard({ booking, role, onAction, busy }) {
  const { slot, student } = booking;
  const actions = bookingActions(booking, role);
  const teacher = slot.teacher;

  return (
    <Card
      variant="outlined"
      sx={(theme) => {
        const accent = STATUS_ACCENT[booking.status];
        const color = accent ? theme.vars.palette[accent].main : theme.vars.palette.divider;
        return { boxShadow: `inset 4px 0 0 ${color}` };
      }}
    >
      <CardContent sx={{ pb: actions.length ? 1 : 2.5, pl: 3 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1 }}
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
        <Stack spacing={0.5}>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', py: 0.5 }}>
            <UserAvatar user={role === 'TEACHER' ? student : teacher} size={30} />
            <Box sx={{ minWidth: 0 }}>
              {role === 'TEACHER' ? (
                <Field label="Студент">
                  {[student.fullName, student.studentGroup, student.email]
                    .filter(Boolean)
                    .join(', ')}
                </Field>
              ) : (
                <Field label="Викладач">
                  {teacher.fullName}
                  {teacher.department ? `, ${teacher.department}` : ''}
                </Field>
              )}
            </Box>
          </Stack>
          <Field label="Місце">
            <Location value={slot.location} />
          </Field>
          {booking.subject && <Field label="Дисципліна">{booking.subject.name}</Field>}
          <Field label="Тема">{booking.topic}</Field>
          {booking.teacherNote && (
            <Field label="Рекомендація викладача">{booking.teacherNote}</Field>
          )}
        </Stack>
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
        <CardActions sx={{ px: 3, pb: 2.5, flexWrap: 'wrap', gap: 1 }}>
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
