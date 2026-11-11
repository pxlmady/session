import { Link as RouterLink } from 'react-router';
import {
  Card,
  CardContent,
  Link,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { formatDateKey } from '../utils/datetime.js';
import { PASSING_SCORE } from '../utils/labels.js';

// Посилання «Записатися» для незадовільної оцінки (FR-33) → сторінка дисципліни з recordId
function RecordAction({ record, from }) {
  if (record.score >= PASSING_SCORE || !record.subject?.id) return null;
  return (
    <Link
      component={RouterLink}
      to={`/subjects/${record.subject.id}?recordId=${encodeURIComponent(record.id)}`}
      state={{ from }}
      underline="hover"
    >
      Записатися
    </Link>
  );
}

// Оцінка, яку викладач виставив у Session за результатом консультації (етап 9б)
function SessionMark({ record }) {
  if (!record.setInSession) return null;
  return (
    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
      Виставлено в Session після консультації, викладач {record.setInSession.teacherName}
    </Typography>
  );
}

const scoreColor = (record) => (record.score < PASSING_SCORE ? 'error.main' : 'text.primary');

// Таблиця оцінок (FR-29): дисципліна, вид контролю, бал, національна шкала, дата, дія.
// На екранах, вужчих за 600 px, – картки з тими самими даними.
// hideActions – без колонки «Дія» (на сторінці дисципліни).
export function GradesTable({ records, from = 'academic', hideActions = false }) {
  const isMobile = useMediaQuery((theme) => theme.breakpoints.down('sm'));

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {records.map((record) => (
          <Card key={record.id} variant="outlined">
            <CardContent>
              <Typography sx={{ fontWeight: 600 }}>{record.subject.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {record.controlType} · {formatDateKey(record.date)}
              </Typography>
              <SessionMark record={record} />
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                <Typography component="span" sx={{ fontWeight: 600, color: scoreColor(record) }}>
                  {record.score}
                </Typography>{' '}
                балів · {record.nationalGrade}
              </Typography>
              {!hideActions && <RecordAction record={record} from={from} />}
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }

  return (
    <TableContainer component={Card} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Дисципліна</TableCell>
            <TableCell>Вид контролю</TableCell>
            <TableCell align="right">Бал</TableCell>
            <TableCell>Національна шкала</TableCell>
            <TableCell>Дата</TableCell>
            {!hideActions && <TableCell>Дія</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {records.map((record) => (
            <TableRow key={record.id}>
              <TableCell>{record.subject.name}</TableCell>
              <TableCell>
                {record.controlType}
                <SessionMark record={record} />
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: scoreColor(record) }}>
                {record.score}
              </TableCell>
              <TableCell>{record.nationalGrade}</TableCell>
              <TableCell>{formatDateKey(record.date)}</TableCell>
              {!hideActions && (
                <TableCell>
                  <RecordAction record={record} from={from} />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
