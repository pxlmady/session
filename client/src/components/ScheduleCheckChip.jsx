import { Chip, Stack, Typography } from '@mui/material';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { conflictText } from '../utils/academic.js';

// Результат перевірки слота на накладку з розкладом (FR-34; UX v2, табл. 4.1):
// «Без накладок» або «Накладка із заняттям» з даними заняття. Для UNAVAILABLE нічого не показує.
export function ScheduleCheckChip({ scheduleCheck, conflicts = [] }) {
  if (scheduleCheck === 'OK') {
    return (
      <Chip
        size="small"
        variant="outlined"
        color="success"
        icon={<CheckCircleOutlinedIcon />}
        label="Без накладок"
      />
    );
  }
  if (scheduleCheck !== 'CONFLICT') return null;
  return (
    <Stack spacing={0.5} sx={{ alignItems: 'flex-start' }}>
      <Chip
        size="small"
        variant="outlined"
        color="warning"
        icon={<WarningAmberIcon />}
        label="Накладка із заняттям"
      />
      {conflicts.map((conflict) => (
        <Typography
          key={conflict.startAt + conflict.subjectName}
          variant="body2"
          color="text.secondary"
        >
          {conflictText(conflict)}
        </Typography>
      ))}
    </Stack>
  );
}
