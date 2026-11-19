import { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
  useMediaQuery,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { slotsApi } from '../api/index.js';
import { ConfirmDialog } from '../components/ConfirmDialog.jsx';
import { Location } from '../components/Location.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { SlotFormDialog } from '../components/SlotFormDialog.jsx';
import { StatusChip } from '../components/StatusChip.jsx';
import { useNotify } from '../context/notification-context.js';
import { useRequest } from '../hooks/useRequest.js';
import { formatDate, formatTimeRange, isFuture } from '../utils/datetime.js';
import { ACTIVE_BOOKING_STATUSES } from '../utils/labels.js';

const activeBooking = (slot) =>
  slot.bookings.find((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status)) ?? null;

// Дії зі слотом (UX, табл. 5.3): «Редагувати» – вільний майбутній;
// «Видалити» – нескасований майбутній
const canEdit = (slot) => slot.status === 'FREE' && isFuture(slot.startAt);
const canDelete = (slot) => slot.status !== 'CANCELLED' && isFuture(slot.startAt);

function BookingInfo({ booking }) {
  if (!booking) {
    return (
      <Typography variant="body2" color="text.secondary">
        Немає активного запису
      </Typography>
    );
  }
  const { student } = booking;
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Typography variant="body2">
        <b>{student.fullName}</b>
        {student.studentGroup ? `, ${student.studentGroup}` : ''}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        Тема: {booking.topic}
      </Typography>
      <StatusChip entity="booking" status={booking.status} />
    </Stack>
  );
}

// Мої слоти (FR-08 – FR-11): список зі статусами й записами, створення, редагування, видалення
export default function SlotsPage() {
  const notify = useNotify();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const [tab, setTab] = useState('upcoming');
  const [form, setForm] = useState({ open: false, slot: null });
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { data, loading, error, reload } = useRequest(() => slotsApi.listMy(), '', 'my-slots');
  const allSlots = data ?? [];
  // Розподіл на вкладки на клієнті за часом завершення слота
  const slots = allSlots.filter((slot) =>
    tab === 'upcoming' ? isFuture(slot.endAt) : !isFuture(slot.endAt),
  );

  const openCreate = () => setForm({ open: true, slot: null });

  const handleSaved = () => {
    notify(form.slot ? 'Слот збережено' : 'Слот створено');
    setForm({ open: false, slot: null });
    reload();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const result = await slotsApi.remove(toDelete.id);
      const hadBooking = Boolean(activeBooking(toDelete));
      notify(
        result === null
          ? 'Слот видалено'
          : hadBooking
            ? 'Слот скасовано, запис студента скасовано'
            : 'Слот скасовано',
      );
      setToDelete(null);
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
      reload();
    }
  };

  const deleteText = (slot) => {
    if (!slot) return '';
    const when = `${formatDate(slot.startAt).slice(4)}, ${formatTimeRange(slot.startAt, slot.endAt)}`;
    const booking = activeBooking(slot);
    return booking
      ? `Слот ${when} має запис студента ${booking.student.fullName}. Слот буде скасовано, а запис – скасовано зі сповіщенням студента. Продовжити?`
      : `Видалити слот ${when}?`;
  };

  const actions = (slot) => {
    if (!canEdit(slot) && !canDelete(slot)) return <span aria-label="Дій немає">—</span>;
    return (
      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
        {canEdit(slot) && (
          <Button size="small" variant="outlined" onClick={() => setForm({ open: true, slot })}>
            Редагувати
          </Button>
        )}
        {canDelete(slot) && (
          <Button
            size="small"
            color="error"
            onClick={() => {
              setDeleteError('');
              setToDelete(slot);
            }}
          >
            Видалити
          </Button>
        )}
      </Stack>
    );
  };

  return (
    <>
      <PageHeader
        title="Мої слоти"
        action={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Створити слот
          </Button>
        }
      />
      <Box sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)}>
          <Tab value="upcoming" label="Майбутні" />
          <Tab value="past" label="Минулі" />
        </Tabs>
      </Box>

      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        empty={slots.length === 0}
        emptyText={
          allSlots.length === 0
            ? 'Ви ще не створили жодного слота'
            : tab === 'upcoming'
              ? 'Майбутніх слотів немає'
              : 'Минулих слотів немає'
        }
        emptyAction={
          allSlots.length === 0 ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Створити слот
            </Button>
          ) : undefined
        }
      />

      {slots.length > 0 &&
        (isMobile ? (
          <Stack spacing={2}>
            {slots.map((slot) => (
              <Card key={slot.id} variant="outlined">
                <CardContent sx={{ pb: 1 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}
                  >
                    <div>
                      <Typography sx={{ fontWeight: 600 }}>{formatDate(slot.startAt)}</Typography>
                      <Typography>{formatTimeRange(slot.startAt, slot.endAt)}</Typography>
                    </div>
                    <StatusChip entity="slot" status={slot.status} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <Location value={slot.location} />
                  </Typography>
                  <BookingInfo booking={activeBooking(slot)} />
                </CardContent>
                <CardActions sx={{ px: 2, pb: 2 }}>{actions(slot)}</CardActions>
              </Card>
            ))}
          </Stack>
        ) : (
          <TableContainer component={Card} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Дата</TableCell>
                  <TableCell>Час</TableCell>
                  <TableCell>Місце</TableCell>
                  <TableCell>Статус слота</TableCell>
                  <TableCell>Запис</TableCell>
                  <TableCell>Дії</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatDate(slot.startAt)}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>
                      {formatTimeRange(slot.startAt, slot.endAt)}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, wordBreak: 'break-word' }}>
                      <Location value={slot.location} />
                    </TableCell>
                    <TableCell>
                      <StatusChip entity="slot" status={slot.status} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 280 }}>
                      <BookingInfo booking={activeBooking(slot)} />
                    </TableCell>
                    <TableCell>{actions(slot)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        ))}

      <SlotFormDialog
        open={form.open}
        slot={form.slot}
        onClose={() => {
          setForm({ open: false, slot: null });
          reload();
        }}
        onSaved={handleSaved}
      />
      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Видалити слот?"
        text={deleteText(toDelete)}
        confirmLabel="Видалити"
        confirmColor="error"
        loading={deleting}
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />
    </>
  );
}
