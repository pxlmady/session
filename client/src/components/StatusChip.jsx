import { Box, Chip } from '@mui/material';
import { BOOKING_STATUS, DEBT_STATUS, SLOT_STATUS } from '../utils/labels.js';

const STATUS_MAPS = { booking: BOOKING_STATUS, slot: SLOT_STATUS, debt: DEBT_STATUS };

// Мітка статусу: текст українською мовою (FR-22), колір і крапка – додаткові ознаки
export function StatusChip({ entity, status }) {
  const meta = (STATUS_MAPS[entity] ?? BOOKING_STATUS)[status];
  if (!meta) return null;
  return (
    <Chip
      size="small"
      label={meta.label}
      color={meta.color}
      variant="filled"
      icon={
        <Box
          component="span"
          aria-hidden="true"
          sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: 'currentColor', flexShrink: 0 }}
        />
      }
      sx={{ '& .MuiChip-icon': { color: 'inherit', ml: 1, mr: -0.25 } }}
    />
  );
}
