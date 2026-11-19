import { Link as RouterLink } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { formatDate, formatDateKey } from '../utils/datetime.js';
import { DEBT_STATUS } from '../utils/labels.js';
import { StatusChip } from './StatusChip.jsx';

// Картка академічної заборгованості (FR-30, FR-33): дисципліна, вид і опис, крайній строк,
// статус і перехід до запису на консультацію (→ сторінка дисципліни з debtId).
// from – сторінка, з якої відкрито дисципліну (для посилання «←» на сторінці дисципліни);
// hideActions – без переходів (на самій сторінці дисципліни).
export function DebtCard({ debt, from, showSubjectLink = false, hideActions = false }) {
  const status = Object.hasOwn(DEBT_STATUS, debt.status ?? '') ? debt.status : 'open';
  const subjectId = debt.subject?.id;
  const subjectUrl = subjectId ? `/subjects/${subjectId}` : null;

  return (
    <Card variant="outlined">
      <CardContent sx={{ pb: hideActions ? 2 : 1 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}
        >
          <Typography
            variant="h6"
            component="h3"
            sx={{ fontSize: '1.05rem', minWidth: 0, overflowWrap: 'anywhere' }}
          >
            {debt.subject?.name ?? 'Дисципліна'}
          </Typography>
          <Box sx={{ flexShrink: 0 }}>
            <StatusChip entity="debt" status={status} />
          </Box>
        </Stack>
        <Typography variant="body2">{debt.debtType}</Typography>
        {debt.description && (
          <Typography variant="body2" color="text.secondary">
            {debt.description}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mt: 1 }}>
          <b>Крайній строк:</b> {debt.deadline ? formatDateKey(debt.deadline) : 'не встановлено'}
        </Typography>
        {debt.closedInSession && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Закрито в Session після консультації {formatDate(debt.closedInSession.closedAt)},
            викладач {debt.closedInSession.teacherName}
          </Typography>
        )}
      </CardContent>
      {!hideActions && (
        <CardActions sx={{ px: 2, pb: 2, flexWrap: 'wrap', gap: 1 }}>
          {debt.status === 'open' && subjectUrl && (
            <Button
              variant="contained"
              size="small"
              component={RouterLink}
              to={`${subjectUrl}?debtId=${encodeURIComponent(debt.id)}`}
              state={{ from }}
            >
              Записатися на консультацію
            </Button>
          )}
          {showSubjectLink && subjectUrl && (
            <Link
              component={RouterLink}
              to={subjectUrl}
              state={{ from }}
              underline="hover"
              sx={{ ml: '0 !important' }}
            >
              Дисципліна →
            </Link>
          )}
          {!subjectUrl && (
            <Typography variant="body2" color="text.secondary">
              Дисципліни немає в довіднику Session
            </Typography>
          )}
        </CardActions>
      )}
    </Card>
  );
}
