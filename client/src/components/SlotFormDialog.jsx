import { useEffect } from 'react';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from '@mui/material';
import { slotsApi } from '../api/index.js';
import { useForm } from '../hooks/useForm.js';
import { fromLocalInput, toLocalInput } from '../utils/datetime.js';
import { validateOptionalText, validateSlotTimes } from '../utils/validation.js';

const EMPTY = { startAt: '', endAt: '', location: '' };

const validate = (values) => ({
  ...validateSlotTimes(values),
  location: validateOptionalText(values.location, 200),
});

const toValues = (slot) =>
  slot
    ? {
        startAt: toLocalInput(slot.startAt),
        endAt: toLocalInput(slot.endAt),
        location: slot.location ?? '',
      }
    : EMPTY;

// Створення (slot = null) і редагування вільного слота (FR-08, FR-10).
// Дата й час вводяться стандартним полем datetime-local і надсилаються в ISO 8601 з зоною.
export function SlotFormDialog({ open, slot, onClose, onSaved }) {
  const form = useForm(EMPTY, validate);
  const { reset } = form;

  useEffect(() => {
    if (open) reset(toValues(slot));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, slot]);

  const close = () => {
    if (!form.submitting) onClose();
  };

  const submit = form.handleSubmit(async (values) => {
    const data = {
      startAt: fromLocalInput(values.startAt),
      endAt: fromLocalInput(values.endAt),
      location: values.location.trim(),
    };
    const saved = slot ? await slotsApi.update(slot.id, data) : await slotsApi.create(data);
    onSaved(saved);
  });

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>{slot ? 'Редагування слота' : 'Новий слот'}</DialogTitle>
        <DialogContent>
          {form.formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {form.formError}
            </Alert>
          )}
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              {...form.field('startAt')}
              type="datetime-local"
              label="Початок"
              required
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: toLocalInput(new Date()) },
              }}
            />
            <TextField
              {...form.field('endAt')}
              type="datetime-local"
              label="Завершення"
              required
              fullWidth
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: form.values.startAt || undefined },
              }}
            />
            <TextField
              {...form.field(
                'location',
                'Аудиторія або посилання на відеозустріч (до 200 символів)',
              )}
              label="Місце проведення"
              fullWidth
              slotProps={{ htmlInput: { maxLength: 200 } }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={form.submitting}>
            Скасувати
          </Button>
          <Button type="submit" variant="contained" loading={form.submitting}>
            Зберегти
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
