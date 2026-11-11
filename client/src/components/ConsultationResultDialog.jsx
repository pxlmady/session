import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { bookingsApi } from '../api/index.js';
import { useForm } from '../hooks/useForm.js';
import { useRequest } from '../hooks/useRequest.js';
import { formatDateKey, formatDateTimeRange } from '../utils/datetime.js';
import { nationalGrade, parseScore } from '../utils/grading.js';
import { validateOptionalText } from '../utils/validation.js';

const NOTE_MAX = 500;
const NO_DEBT = '';
const validate = (values) => ({
  note: validateOptionalText(values.note, NOTE_MAX),
  controlType: values.gradeOn && !values.controlType ? 'Оберіть форму контролю' : '',
  score:
    values.gradeOn && parseScore(values.score) === null ? 'Вкажіть ціле число від 0 до 100' : '',
});

// Причина, з якої оцінку виставити не можна (або '' – можна)
function gradeUnavailableReason(data) {
  if (!data.subject) return 'Запис створено без дисципліни, тому виставити оцінку не можна.';
  if (!data.available || !data.grading) {
    return 'Академічні дані студента недоступні, тому виставити оцінку не можна.';
  }
  return '';
}

// Оцінка з дисципліни запису (поточний семестр студента): форма контролю і бал 0–100
function GradeFields({ data, form }) {
  const reason = gradeUnavailableReason(data);
  if (reason) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {reason}
      </Typography>
    );
  }
  const { gradeOn, controlType, score } = form.values;
  const parsed = parseScore(score);
  return (
    <Box sx={{ mt: 2 }}>
      <FormControlLabel
        control={
          <Checkbox
            checked={gradeOn}
            onChange={(e) => form.setValue('gradeOn', e.target.checked)}
          />
        }
        label={`Виставити оцінку з дисципліни «${data.subject.name}» (${data.grading.semester} семестр)`}
      />
      {gradeOn && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }}>
          <TextField {...form.field('controlType')} select label="Форма контролю" sx={{ flex: 2 }}>
            {data.grading.controlTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            {...form.field(
              'score',
              parsed !== null && controlType ? nationalGrade(parsed, controlType) : '0–100',
            )}
            label="Бал"
            sx={{ flex: 1 }}
            slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 3 } }}
          />
        </Stack>
      )}
    </Box>
  );
}

// Вибір заборгованості студента з дисципліни запису, яку викладач закриває
function DebtChoice({ request, value, onChange }) {
  const { data, loading, error } = request;
  if (loading && !data) return <Skeleton variant="rounded" height={72} sx={{ mt: 2 }} />;

  let message = '';
  if (error) message = 'Не вдалося завантажити академічні дані студента.';
  else if (!data.subject)
    message = 'Запис створено без дисципліни, тому закрити заборгованість не можна.';
  else if (!data.available)
    message = 'Академічні дані студента недоступні, тому закрити заборгованість не можна.';
  else if (data.debts.length === 0)
    message = `Відкритих заборгованостей студента з дисципліни «${data.subject.name}» немає.`;
  if (message) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        {message}
      </Typography>
    );
  }

  return (
    <FormControl sx={{ mt: 2 }}>
      <FormLabel id="debt-choice-label">
        Заборгованість студента з дисципліни «{data.subject.name}»
      </FormLabel>
      <RadioGroup
        aria-labelledby="debt-choice-label"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <FormControlLabel value={NO_DEBT} control={<Radio />} label="Не закривати" />
        {data.debts.map((debt) => (
          <FormControlLabel
            key={debt.id}
            value={debt.id}
            control={<Radio />}
            sx={{ alignItems: 'flex-start', '& .MuiRadio-root': { pt: 0.5 } }}
            label={
              <>
                Закрити: {debt.debtType}
                <Typography variant="body2" color="text.secondary">
                  {[debt.description, debt.deadline && `строк ${formatDateKey(debt.deadline)}`]
                    .filter(Boolean)
                    .join(' · ')}
                </Typography>
              </>
            }
          />
        ))}
      </RadioGroup>
    </FormControl>
  );
}

const submitLabel = (closeDebtId, grade) => {
  if (closeDebtId || grade) return 'Зберегти результат';
  return 'Позначити проведеною';
};

// Результат консультації (етап 9б): після завершення консультації викладач позначає її
// проведеною, за потреби додає рекомендацію студентові, закриває одну відкриту заборгованість
// студента з дисципліни запису і виставляє оцінку з цієї дисципліни. Закриття й оцінка
// зберігаються в Session; дані джерела академічних даних не змінюються.
// Діалог монтується заново для кожного запису (key).
export function ConsultationResultDialog({ booking, onClose, onSaved }) {
  const form = useForm({ note: '', gradeOn: false, controlType: '', score: '' }, validate);
  const [closeDebtId, setCloseDebtId] = useState(NO_DEBT);
  // Після 409 (результат уже зафіксовано, запис змінено) повторне надсилання неможливе
  const [blocked, setBlocked] = useState(false);
  const optionsRequest = useRequest(
    () => bookingsApi.resultOptions(booking.id),
    String(booking.id),
  );
  const options = optionsRequest.data;

  const close = () => {
    if (!form.submitting) onClose(blocked);
  };

  const submit = form.handleSubmit(
    async ({ note, gradeOn, controlType, score }) => {
      const withGrade = gradeOn && options && !gradeUnavailableReason(options);
      const result = await bookingsApi.complete(booking.id, {
        note: note.trim(),
        ...(closeDebtId ? { closeDebtId } : {}),
        ...(withGrade ? { grade: { controlType, score: parseScore(score) } } : {}),
      });
      onSaved(result);
    },
    (err) => {
      // Заборгованість уже закрито або її немає серед відкритих: список оновлюється,
      // результат можна зафіксувати без закриття
      if (err.code === 'DEBT_NOT_CLOSABLE') {
        setCloseDebtId(NO_DEBT);
        optionsRequest.reload();
        return false;
      }
      // Академічні дані студента стали недоступні: параметри оцінки оновлюються
      if (err.code === 'GRADE_NOT_ALLOWED' || err.code === 'ACADEMIC_PROVIDER_UNAVAILABLE') {
        form.setValue('gradeOn', false);
        optionsRequest.reload();
        return false;
      }
      if (err.status !== 409 && err.status !== 404) return false;
      setBlocked(true);
      form.setFormError(err.message);
      return true;
    },
  );

  const noteField = form.field('note');

  return (
    <Dialog open onClose={close} maxWidth="sm" fullWidth>
      <form onSubmit={submit} noValidate>
        <DialogTitle>Результат консультації</DialogTitle>
        <DialogContent>
          {form.formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {form.formError}
            </Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            Консультацію зі студентом {booking.student.fullName} (
            {formatDateTimeRange(booking.slot.startAt, booking.slot.endAt)}) буде позначено як
            проведену. Змінити результат після збереження не можна.
          </DialogContentText>
          <TextField
            {...noteField}
            label="Рекомендація студентові (необов'язково)"
            fullWidth
            multiline
            minRows={3}
            autoFocus
            helperText={noteField.helperText || `${form.values.note.length}/${NOTE_MAX}`}
            slotProps={{ htmlInput: { maxLength: NOTE_MAX } }}
          />
          <DebtChoice request={optionsRequest} value={closeDebtId} onChange={setCloseDebtId} />
          {options && !optionsRequest.error && <GradeFields data={options} form={form} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={close} disabled={form.submitting}>
            Скасувати
          </Button>
          <Button type="submit" variant="contained" loading={form.submitting} disabled={blocked}>
            {submitLabel(closeDebtId, form.values.gradeOn && options?.grading)}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
