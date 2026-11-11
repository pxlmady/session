import { Alert, Chip } from '@mui/material';
import { academicApi } from '../api/index.js';
import { useRequest } from '../hooks/useRequest.js';
import { formatDate } from '../utils/datetime.js';
import { providerLabel } from '../utils/labels.js';

// Позначення демонстраційних даних (FR-37; UX v2, п. 4.4). Банер показується під заголовком
// кожної академічної сторінки (Головна, Розклад, Успішність, Дисципліна). Текст формується з
// meta { provider, isDemo, dataAsOf } (GET /api/academic/status): поки джерело демонстраційне
// або його стан невідомий, показується попередження про демо-дані; для реального постачальника
// (isDemo = false) – рядок «Джерело: …, дані станом на …».
export function DemoDataBanner() {
  const { data } = useRequest(() => academicApi.status(), '', 'academic-status');
  const meta = data?.meta;

  if (meta?.isDemo === false) {
    return (
      <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
        Джерело: {providerLabel(meta.provider)}
        {meta.dataAsOf ? `, дані станом на ${formatDate(meta.dataAsOf)}` : ''}
      </Alert>
    );
  }
  return (
    <Alert severity="info" variant="outlined" sx={{ mb: 3 }}>
      <b>Демонстраційні дані.</b> Session не підключено до систем університету: розклад, оцінки й
      заборгованості надає тестовий постачальник (mock).
    </Alert>
  );
}

// Мітка «Демо-дані» біля окремих блоків з академічними даними на інших сторінках
export function DemoChip() {
  return <Chip size="small" variant="outlined" color="info" label="Демо-дані" />;
}
