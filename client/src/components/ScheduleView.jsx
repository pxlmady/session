import { useNavigate } from 'react-router';
import {
  Box,
  ButtonBase,
  Card,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { formatDate, formatTime, formatTimeRange, toDateKey } from '../utils/datetime.js';
import { tint } from '../theme.js';
import { subjectSx } from '../utils/subjectColor.js';
import { Location } from './Location.jsx';
import { StatusChip } from './StatusChip.jsx';

// Подання розкладу занять (FR-31; UX v2, п. 3.4). Тиждень – таблиця «час × день»; кожна
// дисципліна має власний колір (utils/subjectColor.js). Власні активні консультації студента
// показуються в тій самій сітці пунктирною рамкою з підписом «Консультація» і міткою статусу.

// Скорочення виду заняття для компактної сітки; повна назва – у підказці й у поданні «День»
const CLASS_TYPE_SHORT = {
  Лекція: 'Лк',
  'Практичне заняття': 'Пз',
  'Лабораторна робота': 'Лб',
  Семінар: 'Сем',
};

// Вміст блоку заняття: дисципліна, вид заняття, аудиторія або посилання, викладач
function ClassBody({ entry, compact }) {
  return (
    <>
      <Typography
        variant={compact ? 'body2' : 'body1'}
        sx={{ fontWeight: 600, wordBreak: 'break-word' }}
      >
        {entry.subject.name}
        {compact && (
          <Box component="span" title={entry.classType} sx={{ fontWeight: 400 }}>
            {' '}
            [{CLASS_TYPE_SHORT[entry.classType] ?? entry.classType}]
          </Box>
        )}
      </Typography>
      {!compact && <Typography variant="body2">{entry.classType}</Typography>}
      {entry.location && (
        <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
          <Location value={entry.location} />
        </Typography>
      )}
      {entry.teacherName && (
        <Typography variant="body2" color="text.secondary">
          {entry.teacherName}
        </Typography>
      )}
    </>
  );
}

// Заняття за розкладом карткою: час, дисципліна, вид заняття, аудиторія, викладач
export function ClassCard({ entry }) {
  return (
    <Paper
      variant="outlined"
      sx={[
        { p: 1.5 },
        // Крапка – посередині рядка з назвою: 12 px поля + рядок часу 20 px + пів рядка назви 12 px
        subjectSx(entry.subject, { dotTop: 40.5 }),
      ]}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {formatTimeRange(entry.startAt, entry.endAt)}
      </Typography>
      <ClassBody entry={entry} />
    </Paper>
  );
}

// Консультація в розкладі; натискання відкриває «Мої записи»
function Consultation({ booking, showTime }) {
  const navigate = useNavigate();
  const { slot } = booking;
  return (
    <ButtonBase
      onClick={() => navigate('/my-bookings')}
      sx={{
        display: 'block',
        width: '100%',
        p: 1,
        textAlign: 'left',
        borderRadius: '10px',
        border: '1px dashed',
        borderColor: (theme) => tint(theme, 'secondary', 0.4),
        bgcolor: 'transparent',
        '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
      }}
    >
      {showTime && (
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {formatTimeRange(slot.startAt, slot.endAt)}
        </Typography>
      )}
      <Typography variant="body2" color="primary" sx={{ fontWeight: 600 }}>
        Консультація
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: 'break-word' }}>
        {booking.subject?.name ?? slot.teacher.fullName}
      </Typography>
      {booking.subject && (
        <Typography variant="body2" color="text.secondary">
          {slot.teacher.fullName}
        </Typography>
      )}
      <Box sx={{ mt: 0.5 }}>
        <StatusChip entity="booking" status={booking.status} />
      </Box>
    </ButtonBase>
  );
}

// Події (заняття й консультації) у єдиному вигляді, упорядковані за часом початку
function toItems(entries, bookings) {
  const classes = entries.map((entry) => ({
    key: `c-${entry.id}`,
    startAt: entry.startAt,
    endAt: entry.endAt,
    entry,
  }));
  const consultations = bookings.map((booking) => ({
    key: `b-${booking.id}`,
    startAt: booking.slot.startAt,
    endAt: booking.slot.endAt,
    booking,
  }));
  return [...classes, ...consultations].sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
}

// Подання «День»: список занять обраного дня
export function ScheduleDay({ day, entries, bookings = [] }) {
  const dayKey = toDateKey(day);
  const items = toItems(entries, bookings).filter((item) => toDateKey(item.startAt) === dayKey);
  if (items.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
        Занять у цей день немає
      </Typography>
    );
  }
  return (
    <Stack spacing={1}>
      {items.map((item) =>
        item.entry ? (
          <ClassCard key={item.key} entry={item.entry} />
        ) : (
          <Consultation key={item.key} booking={item.booking} showTime />
        ),
      )}
    </Stack>
  );
}

// Подання «Тиждень»: таблиця, рядки – інтервали часу, колонки – дні Пн–Пт
// (Сб, Нд – лише якщо є заняття або консультації)
export function ScheduleWeek({ weekStart, entries, bookings = [] }) {
  const todayKey = toDateKey(new Date());
  const items = toItems(entries, bookings);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(date.getDate() + index);
    return { date, key: toDateKey(date) };
  }).filter((day, index) => index < 5 || items.some((item) => toDateKey(item.startAt) === day.key));

  // Рядки таблиці: унікальні інтервали «початок–завершення» за місцевим часом
  const rowKey = (item) => `${formatTime(item.startAt)}–${formatTime(item.endAt)}`;
  const rows = [...new Set(items.map(rowKey))].sort();

  return (
    <TableContainer component={Card} variant="outlined">
      <Table sx={{ tableLayout: 'fixed', minWidth: 96 + days.length * 156 }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: 96 }}>Час</TableCell>
            {days.map((day) => (
              <TableCell
                key={day.key}
                align="center"
                aria-current={day.key === todayKey ? 'date' : undefined}
                sx={(theme) =>
                  day.key === todayKey
                    ? {
                        bgcolor: `${tint(theme, 'primary', 0.06)} !important`,
                        boxShadow: theme.vars.palette.glow.today,
                      }
                    : {}
                }
              >
                {formatDate(day.date)}
                {day.key === todayKey && (
                  <Chip
                    size="small"
                    color="primary"
                    label="Сьогодні"
                    icon={
                      <Box
                        component="span"
                        aria-hidden="true"
                        sx={(theme) => ({
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          bgcolor: 'currentColor',
                          boxShadow: `${theme.vars.palette.glow.dot} currentColor`,
                        })}
                      />
                    }
                    sx={{ ml: 1, '& .MuiChip-icon': { ml: 1, mr: -0.25 } }}
                  />
                )}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row}>
              <TableCell
                component="th"
                scope="row"
                sx={{ fontWeight: 600, verticalAlign: 'top', fontVariantNumeric: 'tabular-nums' }}
              >
                {row}
              </TableCell>
              {days.map((day) => {
                const cell = items.filter(
                  (item) => toDateKey(item.startAt) === day.key && rowKey(item) === row,
                );
                return (
                  <TableCell
                    key={day.key}
                    sx={{
                      p: 0.5,
                      verticalAlign: 'top',
                      borderLeft: 1,
                      borderColor: 'divider',
                      bgcolor: (theme) =>
                        day.key === todayKey ? tint(theme, 'primary', 0.04) : undefined,
                    }}
                  >
                    <Stack spacing={0.5} sx={{ height: '100%' }}>
                      {cell.map((item) =>
                        item.entry ? (
                          <Box key={item.key} sx={[{ p: 1 }, subjectSx(item.entry.subject)]}>
                            <ClassBody entry={item.entry} compact />
                          </Box>
                        ) : (
                          <Consultation key={item.key} booking={item.booking} />
                        ),
                      )}
                    </Stack>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
