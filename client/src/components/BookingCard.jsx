import { Button, Card, CardActions, CardContent, Stack, Typography } from '@mui/material';
import { formatDate, formatTimeRange, isFuture } from '../utils/datetime.js';
import { Location } from './Location.jsx';
import { StatusChip } from './StatusChip.jsx';

// Дії із записом залежно від статусу, ролі та часу (UX, табл. 5.2)
function bookingActions(booking, role) {
  if (!isFuture(booking.slot.startAt)) return [];
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
// місце, тема та доступні дії
export function BookingCard({ booking, role, onAction, busy }) {
  const { slot, student } = booking;
  const actions = bookingActions(booking, role);
  const teacher = slot.teacher;

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: actions.length ? 1 : 2 }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 1 }}
        >
          <Typography variant="h6" component="h2" sx={{ fontSize: '1.05rem' }}>
            {formatDate(slot.startAt)} · {formatTimeRange(slot.startAt, slot.endAt)}
          </Typography>
          <div>
            <StatusChip entity="booking" status={booking.status} />
          </div>
        </Stack>
        <Stack spacing={0.5}>
          {role === 'TEACHER' ? (
            <Field label="Студент">
              {[student.fullName, student.studentGroup, student.email].filter(Boolean).join(', ')}
            </Field>
          ) : (
            <Field label="Викладач">
              {teacher.fullName}
              {teacher.department ? `, ${teacher.department}` : ''}
            </Field>
          )}
          <Field label="Місце">
            <Location value={slot.location} />
          </Field>
          <Field label="Тема">{booking.topic}</Field>
        </Stack>
      </CardContent>
      {actions.length > 0 && (
        <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
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
