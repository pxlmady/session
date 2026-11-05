import { Chip } from '@mui/material';
import { BOOKING_STATUS, SLOT_STATUS } from '../utils/labels.js';

// Мітка статусу: текст українською мовою (FR-22) і колір як додаткова ознака
export function StatusChip({ entity, status }) {
  const meta = (entity === 'slot' ? SLOT_STATUS : BOOKING_STATUS)[status];
  if (!meta) return null;
  return <Chip size="small" label={meta.label} color={meta.color} variant="filled" />;
}
