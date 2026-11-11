import { useSearchParams } from 'react-router';
import {
  Button,
  IconButton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  useMediaQuery,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EventBusyOutlinedIcon from '@mui/icons-material/EventBusyOutlined';
import TodayIcon from '@mui/icons-material/Today';
import { academicApi, bookingsApi } from '../api/index.js';
import { AcademicSection } from '../components/AcademicSection.jsx';
import { DemoDataBanner } from '../components/DemoDataBanner.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { ScheduleDay, ScheduleWeek } from '../components/ScheduleView.jsx';
import { useRequest } from '../hooks/useRequest.js';
import {
  addDays,
  formatDate,
  formatDateRange,
  parseDateKey,
  startOfWeek,
  toDateKey,
} from '../utils/datetime.js';
import { ACTIVE_BOOKING_STATUSES } from '../utils/labels.js';

// Розклад занять за тижнями й днями (FR-31; UX v2, п. 3.4). Обрані подання й дата
// зберігаються в адресі (?view=week|day&date=YYYY-MM-DD). Дані запитуються за тиждень,
// що містить обрану дату; на екранах, вужчих за 600 px, доступне лише подання «День».
export default function SchedulePage() {
  const [params, setParams] = useSearchParams();
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));
  const view = isMobile || params.get('view') === 'day' ? 'day' : 'week';
  const date = parseDateKey(params.get('date')) ?? new Date();
  const weekStart = startOfWeek(date);
  const from = toDateKey(weekStart);
  const to = toDateKey(addDays(weekStart, 6));

  const schedule = useRequest(() => academicApi.schedule(from, to), from, 'schedule');
  // Власні активні консультації (дані Session) – окремою позначкою в розкладі
  const bookingsRequest = useRequest(
    () => bookingsApi.listMy('upcoming'),
    'upcoming',
    'my-bookings',
  );
  const bookings = (bookingsRequest.data ?? []).filter((booking) =>
    ACTIVE_BOOKING_STATUSES.includes(booking.status),
  );

  const update = (next) => {
    const merged = { view: params.get('view') ?? 'week', date: toDateKey(date), ...next };
    setParams(merged, { replace: true });
  };
  const step = view === 'week' ? 7 : 1;
  const move = (direction) => update({ date: toDateKey(addDays(date, direction * step)) });

  const rangeLabel =
    view === 'week' ? formatDateRange(weekStart, addDays(weekStart, 6)) : formatDate(date);
  const dayKey = toDateKey(date);
  const isEmpty = ({ data: entries }) =>
    view === 'week'
      ? entries.length === 0 &&
        !bookings.some((b) => {
          const key = toDateKey(b.slot.startAt);
          return key >= from && key <= to;
        })
      : !entries.some((e) => toDateKey(e.startAt) === dayKey) &&
        !bookings.some((b) => toDateKey(b.slot.startAt) === dayKey);

  return (
    <>
      <PageHeader
        title="Розклад"
        action={
          !isMobile && (
            <ToggleButtonGroup
              size="small"
              exclusive
              value={view}
              onChange={(_e, value) => value && update({ view: value })}
              aria-label="Подання розкладу"
            >
              <ToggleButton value="week">Тиждень</ToggleButton>
              <ToggleButton value="day">День</ToggleButton>
            </ToggleButtonGroup>
          )
        }
      />
      <DemoDataBanner />

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <IconButton
          onClick={() => move(-1)}
          aria-label={view === 'week' ? 'Попередній тиждень' : 'Попередній день'}
        >
          <ChevronLeftIcon />
        </IconButton>
        <Typography sx={{ fontWeight: 600, minWidth: { sm: 180 }, textAlign: 'center' }}>
          {rangeLabel}
        </Typography>
        <IconButton
          onClick={() => move(1)}
          aria-label={view === 'week' ? 'Наступний тиждень' : 'Наступний день'}
        >
          <ChevronRightIcon />
        </IconButton>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TodayIcon />}
          onClick={() => update({ date: toDateKey(new Date()) })}
        >
          Сьогодні
        </Button>
      </Stack>

      <AcademicSection
        request={schedule}
        isEmpty={isEmpty}
        emptyText={view === 'week' ? 'Занять на цьому тижні немає' : 'Занять у цей день немає'}
        emptyIcon={EventBusyOutlinedIcon}
        skeletonRows={4}
      >
        {({ data: entries }) =>
          view === 'week' ? (
            <ScheduleWeek weekStart={weekStart} entries={entries} bookings={bookings} />
          ) : (
            <ScheduleDay day={date} entries={entries} bookings={bookings} />
          )
        }
      </AcademicSection>
    </>
  );
}
