import { useState } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { bookingsApi } from '../api/index.js';
import { useForm } from '../hooks/useForm.js';
import { conflictText } from '../utils/academic.js';
import { formatDate, formatTimeRange } from '../utils/datetime.js';
import { validateTopic } from '../utils/validation.js';
import { Location } from './Location.jsx';

const TOPIC_MAX = 500;
const validate = (values) => ({ topic: validateTopic(values.topic) });

// Форма бронювання слота з обов'язковою темою запитання (FR-15). Академічний контекст
// (UX v2, п. 3.8, 4.2, 4.3): дисципліна запису (subjectId), тема за шаблоном (initialTopic),
// попередження про накладку із заняттям і прапорець підтвердження (FR-35). Діалог монтується
// заново для кожного слота (key), тому початкові значення беруться з props.
export function BookingDialog({
  open,
  slot,
  teacher,
  subject,
  initialTopic = '',
  onClose,
  onBooked,
}) {
  const form = useForm({ topic: initialTopic }, validate);
  // Після помилки 409/404 (слот уже зайнято, скасовано, розпочався) повторне бронювання
  // цього слота неможливе; після закриття діалогу список слотів оновлюється
  const [conflict, setConflict] = useState(false);
  // Заняття, з якими перетинається слот: зі списку слотів або з відповіді 409 SCHEDULE_CONFLICT
  const [scheduleConflicts, setScheduleConflicts] = useState(
    slot?.scheduleCheck === 'CONFLICT' ? slot.conflicts : [],
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const hasScheduleConflict = scheduleConflicts.length > 0;

  const close = () => {
    if (form.submitting) return;
    onClose(conflict);
  };

  const submit = form.handleSubmit(
    async ({ topic }) => {
      const booking = await bookingsApi.create({
        slotId: slot.id,
        topic: topic.trim(),
        ...(subject ? { subjectId: subject.id } : {}),
        ...(hasScheduleConflict ? { acknowledgeConflict: true } : {}),
      });
      onBooked(booking);
    },
    (err) => {
      // Розклад змінився після завантаження списку: попередження і підтвердження,
      // введена тема зберігається (UX v2, табл. 4.1)
      if (err.code === 'SCHEDULE_CONFLICT') {
        setScheduleConflicts(err.details);
        setAcknowledged(false);
        return true;
      }
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
            {subject && (
              <Typography>
                <b>Дисципліна:</b> {subject.name}
              </Typography>
            )}
            {slot.scheduleCheck === 'UNAVAILABLE' && !hasScheduleConflict && (
              <Typography variant="body2" color="text.secondary">
                Розклад не перевірено — академічні дані недоступні
              </Typography>
            )}
          </Stack>
          {hasScheduleConflict && !conflict && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>Консультація перетинається із заняттям</AlertTitle>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {scheduleConflicts.map((item) => (
                  <li key={item.startAt + item.subjectName}>{conflictText(item)}</li>
                ))}
              </Box>
              <FormControlLabel
                sx={{ mt: 1, alignItems: 'flex-start' }}
                control={
                  <Checkbox
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    sx={{ pt: 0.25 }}
                  />
                }
                label="Я розумію, що консультація збігається із заняттям, і все одно хочу записатися"
              />
            </Alert>
          )}
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
          <Button
            type="submit"
            variant="contained"
            loading={form.submitting}
            disabled={conflict || (hasScheduleConflict && !acknowledged)}
          >
            Забронювати
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
