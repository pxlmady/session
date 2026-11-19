import { Link as RouterLink } from 'react-router';
import { Button, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material';
import AssignmentLateOutlinedIcon from '@mui/icons-material/AssignmentLateOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { academicApi, bookingsApi } from '../api/index.js';
import { AcademicSection } from '../components/AcademicSection.jsx';
import { DebtCard } from '../components/DebtCard.jsx';
import { DemoDataBanner } from '../components/DemoDataBanner.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { Panel } from '../components/Panel.jsx';
import { ClassCard } from '../components/ScheduleView.jsx';
import { StatusChip } from '../components/StatusChip.jsx';
import { UserAvatar } from '../components/UserAvatar.jsx';
import { useAuth } from '../context/auth-context.js';
import { useRequest } from '../hooks/useRequest.js';
import { addDays, formatDate, formatDateTimeRange, toDateKey } from '../utils/datetime.js';
import { ACTIVE_BOOKING_STATUSES } from '../utils/labels.js';

// Скільки днів уперед шукати наступний навчальний день
const LOOKAHEAD_DAYS = 14;

function MoreLink({ to, children }) {
  return (
    <Link
      component={RouterLink}
      to={to}
      underline="hover"
      variant="body2"
      sx={{ whiteSpace: 'nowrap' }}
    >
      {children}
    </Link>
  );
}

// Заняття сьогодні; після завершення останнього заняття або у вихідний – наступного
// навчального дня (UX v2, п. 3.3)
function pickClassDay(entries) {
  const now = Date.now();
  const todayKey = toDateKey(new Date());
  const today = entries.filter((entry) => toDateKey(entry.startAt) === todayKey);
  if (today.some((entry) => new Date(entry.endAt).getTime() > now)) {
    return { isToday: true, date: new Date(), entries: today };
  }
  const next = entries.find((entry) => toDateKey(entry.startAt) > todayKey);
  if (!next) return null;
  const key = toDateKey(next.startAt);
  return {
    isToday: false,
    date: new Date(next.startAt),
    entries: entries.filter((entry) => toDateKey(entry.startAt) === key),
  };
}

function TodayClasses() {
  const from = toDateKey(new Date());
  const to = toDateKey(addDays(new Date(), LOOKAHEAD_DAYS - 1));
  const request = useRequest(() => academicApi.schedule(from, to), from, 'dashboard-schedule');
  const day = request.data ? pickClassDay(request.data.data) : null;

  return (
    <Panel
      icon={CalendarMonthOutlinedIcon}
      title={
        day
          ? `${day.isToday ? 'Заняття сьогодні' : 'Заняття'} · ${formatDate(day.date)}`
          : 'Заняття сьогодні'
      }
      action={<MoreLink to="/schedule">Увесь розклад →</MoreLink>}
    >
      <AcademicSection
        request={request}
        compact
        isEmpty={() => !day}
        emptyText="Найближчими днями занять немає"
        emptyIcon={EventAvailableOutlinedIcon}
      >
        {() => (
          <Stack spacing={1}>
            {day.entries.map((entry) => (
              <ClassCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}
      </AcademicSection>
    </Panel>
  );
}

// Найближчі консультації – дані Session, не залежать від академічного джерела
function UpcomingConsultations() {
  const { data, loading, error, reload } = useRequest(
    () => bookingsApi.listMy('upcoming'),
    'upcoming',
    'my-bookings',
  );
  const bookings = (data ?? [])
    .filter((booking) => ACTIVE_BOOKING_STATUSES.includes(booking.status))
    .slice(0, 3);

  return (
    <Panel
      icon={ForumOutlinedIcon}
      tone="secondary"
      title="Найближчі консультації"
      action={<MoreLink to="/my-bookings">Мої записи →</MoreLink>}
    >
      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        empty={bookings.length === 0}
        emptyText="Найближчих консультацій немає"
        emptyIcon={EventAvailableOutlinedIcon}
        emptyAction={
          <Button variant="contained" component={RouterLink} to="/teachers">
            Знайти викладача
          </Button>
        }
        skeletonRows={2}
      />
      {bookings.length > 0 && !error && (
        <Stack spacing={1}>
          {bookings.map((booking) => (
            <Card key={booking.id} variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}
                >
                  <Typography sx={{ fontWeight: 600 }}>
                    {formatDateTimeRange(booking.slot.startAt, booking.slot.endAt)}
                  </Typography>
                  <div>
                    <StatusChip entity="booking" status={booking.status} />
                  </div>
                </Stack>
                <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center', mt: 1 }}>
                  <UserAvatar user={booking.slot.teacher} size={28} />
                  <div>
                    <Typography variant="body2">{booking.slot.teacher.fullName}</Typography>
                    {booking.subject && (
                      <Typography variant="body2" color="text.secondary">
                        {booking.subject.name}
                      </Typography>
                    )}
                  </div>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Panel>
  );
}

function OpenDebts() {
  const request = useRequest(() => academicApi.debts('open'), 'open', 'dashboard-debts');
  const debts = request.data?.data ?? [];

  return (
    <Panel
      icon={AssignmentLateOutlinedIcon}
      tone="warning"
      title={`Відкриті академічні заборгованості${request.data ? ` (${debts.length})` : ''}`}
    >
      <AcademicSection
        request={request}
        isEmpty={() => debts.length === 0}
        emptyText="Відкритих заборгованостей немає"
        emptyIcon={TaskAltIcon}
      >
        {() => (
          <Stack spacing={1.5}>
            {debts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} from="dashboard" />
            ))}
          </Stack>
        )}
      </AcademicSection>
    </Panel>
  );
}

// Головна сторінка студента (FR-38): заняття, найближчі консультації, відкриті заборгованості.
// Кожен блок завантажується окремо, тому збій академічного джерела не приховує консультації.
export default function DashboardPage() {
  const { user } = useAuth();
  // ПІБ: «Прізвище Ім'я По батькові» – у привітанні ім'я (або перше слово, якщо слово одне)
  const words = user.fullName.trim().split(/\s+/);
  const name = words[1] ?? words[0];
  return (
    <>
      <PageHeader
        title="Головна"
        subtitle={`Вітаємо, ${name}! Заняття, консультації та заборгованості – на одній сторінці.`}
      />
      <DemoDataBanner />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 6 }}>
          <Stack spacing={3}>
            <TodayClasses />
            <UpcomingConsultations />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, lg: 6 }}>
          <OpenDebts />
        </Grid>
      </Grid>
    </>
  );
}
