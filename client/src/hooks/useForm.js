import { useState } from 'react';
import { detailsToFieldErrors } from '../utils/validation.js';

// Стан форми: значення, помилки клієнтської перевірки (показуються після виходу з поля
// або після спроби надсилання), помилки сервера під полями та загальна помилка над формою.
export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [dirty, setDirty] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const clientErrors = validate(values);

  const fieldError = (name) =>
    serverErrors[name] || ((touched[name] || submitted) && clientErrors[name]) || '';

  const setValue = (name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setDirty((prev) => (prev[name] ? prev : { ...prev, [name]: true }));
    setServerErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  // Властивості для TextField: value, onChange, onBlur, error, helperText
  const field = (name, helperText = '') => ({
    name,
    value: values[name],
    onChange: (e) => setValue(name, e.target.value),
    // Поле вважається «відвіданим» після виходу з нього, якщо його вже редагували;
    // порожні необов'язково відвідані поля перевіряються під час надсилання
    onBlur: () => dirty[name] && setTouched((prev) => ({ ...prev, [name]: true })),
    error: Boolean(fieldError(name)),
    helperText: fieldError(name) || helperText,
  });

  // Обробник надсилання: перевірка на клієнті, виклик onSubmit, розбір помилок API.
  // onError може повернути true, якщо помилку оброблено інакше.
  const handleSubmit = (onSubmit, onError) => async (event) => {
    event?.preventDefault();
    setSubmitted(true);
    setFormError('');
    if (Object.values(clientErrors).some(Boolean)) return;
    setSubmitting(true);
    try {
      await onSubmit(values);
    } catch (err) {
      if (onError?.(err)) return;
      if (err.code === 'VALIDATION_ERROR' && err.details.length > 0) {
        const fields = detailsToFieldErrors(err.details);
        setServerErrors(fields);
        setFormError(fields._form ?? '');
      } else {
        setFormError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = (next = initialValues) => {
    setValues(next);
    setTouched({});
    setDirty({});
    setSubmitted(false);
    setServerErrors({});
    setFormError('');
  };

  return {
    values,
    setValue,
    field,
    fieldError,
    formError,
    setFormError,
    setServerErrors,
    submitting,
    handleSubmit,
    reset,
  };
}
