import { useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Box, Button, Stack, Tab, Tabs } from '@mui/material';
import { bookingsApi } from '../api/index.js';
import { BookingCard } from '../components/BookingCard.jsx';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { useAuth } from '../context/auth-context.js';
import { useNotify } from '../context/notification-context.js';
import { useRequest } from '../hooks/useRequest.js';
import { formatDateTimeRange } from '../utils/datetime.js';

const SUCCESS = {
  confirm: 'Запис підтверджено',
  reject: 'Запис відхилено. Слот знову вільний',
  cancel: 'Запис скасовано',
};

function confirmText(action, booking, role) {
  const when = formatDateTimeRange(booking.slot.startAt, booking.slot.endAt);
  if (action === 'reject') {
    return {
      title: 'Відхилити запис?',
      text: `Запис студента ${booking.student.fullName} на ${when} буде відхилено (статус «Скасовано»). Слот знову стане вільним.`,
      confirmLabel: 'Відхилити',
    };
  }
  const who =
    role === 'TEACHER'
      ? `студента ${booking.student.fullName}`
      : `до викладача ${booking.slot.teacher.fullName}`;
  return {
    title: 'Скасувати запис?',
    text: `Запис ${who} на ${when} буде скасовано. Слот знову стане вільним.`,
    confirmLabel: 'Скасувати запис',
  };
}

// Мої записи (FR-18 – FR-21): вкладки «Майбутні» і «Минулі», статуси, дії за роллю
export default function MyBookingsPage() {
  const { user } = useAuth();
  const notify = useNotify();
  const [period, setPeriod] = useState('upcoming');
  const [pending, setPending] = useState(null); // { action, booking } для діалогу підтвердження
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);

  const { data, loading, error, reload } = useRequest(() => bookingsApi.listMy(period), period);
  const bookings = data ?? [];

  const runAction = async (action, booking) => {
    setBusy(true);
    try {
      await bookingsApi[action](booking.id);
      setPending(null);
      notify(SUCCESS[action]);
      reload();
    } catch (err) {
      if (pending || action !== 'confirm') {
        setDialogError(err.message);
      } else {
        notify(err.message, 'error');
      }
      // Стан запису міг змінитися паралельно – список оновлюється
      reload();
    } finally {
      setBusy(false);
    }
  };

  // «Підтвердити» виконується одразу; «Відхилити» і «Скасувати» – через діалог
  const handleAction = (action, booking) => {
    if (action === 'confirm') {
      runAction(action, booking);
    } else {
      setDialogError('');
      setPending({ action, booking });
    }
  };

  const dialog = pending ? confirmText(pending.action, pending.booking, user.role) : null;
  const emptyText = period === 'upcoming' ? 'Майбутніх записів немає' : 'Минулих записів немає';

  return (
    <>
      <PageHeader title="Мої записи" />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={period} onChange={(_e, value) => setPeriod(value)}>
          <Tab value="upcoming" label="Майбутні" />
          <Tab value="past" label="Минулі" />
        </Tabs>
      </Box>

      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        empty={bookings.length === 0}
        emptyText={emptyText}
        emptyAction={
          user.role === 'STUDENT' && period === 'upcoming' ? (
            <Button variant="contained" component={RouterLink} to="/teachers">
              Знайти викладача
            </Button>
          ) : undefined
        }
      />

      {bookings.length > 0 && (
        <Stack spacing={2}>
          {bookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              role={user.role}
              busy={busy}
              onAction={handleAction}
            />
          ))}
        </Stack>
      )}

      <ConfirmDialog
        open={Boolean(pending)}
        title={dialog?.title}
        text={dialog?.text}
        confirmLabel={dialog?.confirmLabel}
        confirmColor="error"
        loading={busy}
        error={dialogError}
        onConfirm={() => runAction(pending.action, pending.booking)}
        onClose={() => setPending(null)}
      />
    </>
  );
}
