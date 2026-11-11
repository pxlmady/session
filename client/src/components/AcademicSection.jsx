import { Link as RouterLink } from 'react-router';
import { Alert, AlertTitle, Button } from '@mui/material';
import { isAcademicError } from '../utils/academic.js';
import { PageState } from './PageState.jsx';

// Повідомлення про стани академічних даних (UX v2, табл. 6.4, 8.1)
export function AcademicUnavailable({ error, onRetry, compact = false }) {
  if (error?.code === 'ACADEMIC_PROFILE_NOT_LINKED') {
    return (
      <Alert
        severity="info"
        action={
          compact ? undefined : (
            <Button
              color="inherit"
              size="small"
              component={RouterLink}
              to="/teachers"
              sx={{ whiteSpace: 'nowrap' }}
            >
              Знайти викладача
            </Button>
          )
        }
      >
        <AlertTitle>Академічні дані недоступні</AlertTitle>
        Ваш обліковий запис не зіставлено з академічним профілем. Запис на консультації працює як
        звичайно.
      </Alert>
    );
  }
  if (error?.code === 'ACADEMIC_PROVIDER_UNAVAILABLE') {
    return (
      <Alert
        severity="warning"
        action={
          onRetry ? (
            <Button color="inherit" size="small" onClick={onRetry} sx={{ whiteSpace: 'nowrap' }}>
              Спробувати ще раз
            </Button>
          ) : undefined
        }
      >
        <AlertTitle>Джерело академічних даних тимчасово недоступне</AlertTitle>
        Бронювання консультацій доступне.
      </Alert>
    );
  }
  return null;
}

// Блок з академічними даними з власними станами: завантаження, «не зіставлено» (404),
// «джерело недоступне» (503), інша помилка, порожньо. Збій академічного джерела не впливає
// на інші блоки сторінки (FR-36). request – результат useRequest; children – функція від data.
export function AcademicSection({
  request,
  isEmpty = () => false,
  emptyText,
  emptyIcon,
  emptyAction,
  skeletonRows = 2,
  compact,
  children,
}) {
  const { data, loading, error, reload } = request;
  if (isAcademicError(error)) {
    return <AcademicUnavailable error={error} onRetry={reload} compact={compact} />;
  }
  if (!data || error) {
    return (
      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        skeletonRows={skeletonRows}
      />
    );
  }
  if (isEmpty(data)) {
    return (
      <PageState empty emptyText={emptyText} emptyIcon={emptyIcon} emptyAction={emptyAction} />
    );
  }
  return children(data);
}
