import { Link as RouterLink } from 'react-router';
import { Button, Card, CardContent, Grid, Link, Stack, Typography } from '@mui/material';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { academicApi, bookingsApi } from '../api/index.js';
import { AcademicSection } from '../components/AcademicSection.jsx';
import { DebtCard } from '../components/DebtCard.jsx';
import { DemoDataBanner } from '../components/DemoDataBanner.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { ClassCard } from '../components/ScheduleView.jsx';
import { StatusChip } from '../components/StatusChip.jsx';
import { useRequest } from '../hooks/useRequest.js';
import { addDays, formatDate, formatDateTimeRange, toDateKey } from '../utils/datetime.js';
import { ACTIVE_BOOKING_STATUSES } from '../utils/labels.js';

// Скільки днів уперед шукати наступний навчальний день
const LOOKAHEAD_DAYS = 14;

function SectionTitle({ children, link }) {
  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: 'baseline', mb: 1.5, flexWrap: 'wrap' }}
    >
      <Typography variant="h6" component="h2">
        {children}
      </Typography>
      {link}
    </Stack>
  );
}

function MoreLink({ to, children }) {
  return (
    <Link component={RouterLink} to={to} underline="hover" variant="body2">
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
    <section>
      <SectionTitle link={<MoreLink to="/schedule">Увесь розклад →</MoreLink>}>
        {day
          ? `${day.isToday ? 'Заняття сьогодні' : 'Заняття'} · ${formatDate(day.date)}`
          : 'Заняття сьогодні'}
      </SectionTitle>
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
    </section>
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
    <section>
      <SectionTitle link={<MoreLink to="/my-bookings">Мої записи →</MoreLink>}>
        Найближчі консультації
      </SectionTitle>
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
                <Typography variant="body2">{booking.slot.teacher.fullName}</Typography>
                {booking.subject && (
                  <Typography variant="body2" color="text.secondary">
                    {booking.subject.name}
                  </Typography>
                )}
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </section>
  );
}

function OpenDebts() {
  const request = useRequest(() => academicApi.debts('open'), 'open', 'dashboard-debts');
  const debts = request.data?.data ?? [];

  return (
    <section>
      <SectionTitle>
        Відкриті академічні заборгованості{request.data ? ` (${debts.length})` : ''}
      </SectionTitle>
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
    </section>
  );
}

// Головна сторінка студента (FR-38): заняття, найближчі консультації, відкриті заборгованості.
// Кожен блок завантажується окремо, тому збій академічного джерела не приховує консультації.
export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Головна" />
      <DemoDataBanner />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={4}>
            <TodayClasses />
            <UpcomingConsultations />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <OpenDebts />
        </Grid>
      </Grid>
    </>
  );
}
