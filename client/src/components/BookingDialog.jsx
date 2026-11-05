import { useState } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { bookingsApi } from '../api/index.js';
import { useForm } from '../hooks/useForm.js';
import { formatDate, formatTimeRange } from '../utils/datetime.js';
import { validateTopic } from '../utils/validation.js';
import { Location } from './Location.jsx';

const TOPIC_MAX = 500;
const validate = (values) => ({ topic: validateTopic(values.topic) });

// Форма бронювання слота з обов'язковою темою запитання (FR-15)
export function BookingDialog({ open, slot, teacher, onClose, onBooked }) {
  const form = useForm({ topic: '' }, validate);
  // Після помилки 409/404 (слот уже зайнято, скасовано, розпочався) повторне бронювання
  // цього слота неможливе; після закриття діалогу список слотів оновлюється
  const [conflict, setConflict] = useState(false);

  const close = () => {
    if (form.submitting) return;
    form.reset();
    setConflict(false);
    onClose(conflict);
  };

  const submit = form.handleSubmit(
    async ({ topic }) => {
      const booking = await bookingsApi.create({ slotId: slot.id, topic: topic.trim() });
      form.reset();
      onBooked(booking);
    },
    (err) => {
      if (err.status !== 409 && err.status !== 404) return false;
      setConflict(true);
      form.setFormError(err.message);
      return true;
    },
  );

  if (!slot) return null;
  const topicField = form.field('topic');

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>Бронювання консультації</DialogTitle>
        <DialogContent>
          {form.formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {form.formError}
            </Alert>
          )}
          <Stack spacing={0.5} sx={{ mb: 2 }}>
            <Typography>
              <b>Викладач:</b> {teacher?.fullName ?? '—'}
            </Typography>
            <Typography>
              <b>Дата:</b> {formatDate(slot.startAt)}
            </Typography>
            <Typography>
              <b>Час:</b> {formatTimeRange(slot.startAt, slot.endAt)}
            </Typography>
            <Typography>
              <b>Місце:</b> <Location value={slot.location} />
            </Typography>
          </Stack>
          <TextField
            {...topicField}
            label="Тема запитання"
            required
            fullWidth
            multiline
            minRows={3}
            autoFocus
            helperText={topicField.helperText || `${form.values.topic.length}/${TOPIC_MAX}`}
            slotProps={{ htmlInput: { maxLength: TOPIC_MAX } }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={form.submitting}>
            Скасувати
          </Button>
          <Button type="submit" variant="contained" loading={form.submitting} disabled={conflict}>
            Забронювати
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
