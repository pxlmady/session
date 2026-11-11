import { Link as RouterLink } from 'react-router';
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import { teachersApi } from '../api/index.js';
import { useRequest } from '../hooks/useRequest.js';
import { nearestSlot } from '../utils/academic.js';
import { formatDateTimeRange } from '../utils/datetime.js';

// Викладач дисципліни з найближчим вільним слотом і переходом до вибору часу (FR-32, FR-33).
// context – параметри для сторінки слотів: subjectId і, за наявності, debtId або recordId.
export function SubjectTeacherCard({ teacher, context }) {
  const params = new URLSearchParams(
    Object.entries(context).filter(([, value]) => value !== undefined && value !== null),
  );
  const {
    data: slots,
    loading,
    error,
  } = useRequest(() => teachersApi.freeSlots(teacher.id), String(teacher.id), 'teacher-free-slots');
  const slot = nearestSlot(slots ?? []);
  const checked = slot?.scheduleCheck === 'OK';

  let slotText;
  if (loading && !slots) slotText = 'Завантаження слотів…';
  else if (error) slotText = 'Не вдалося завантажити слоти';
  else if (slot) {
    slotText = `${checked ? 'Найближчий слот без накладки' : 'Найближчий вільний слот'}: ${formatDateTimeRange(slot.startAt, slot.endAt)}`;
  } else if ((slots ?? []).length > 0) slotText = 'Вільних слотів без накладки немає';
  else slotText = 'Вільних слотів немає';

  return (
    <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="h6" component="h3" sx={{ fontSize: '1.05rem' }}>
          {teacher.fullName}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          {teacher.department || 'Кафедру не вказано'}
        </Typography>
        <Typography variant="body2">{slotText}</Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2 }}>
        <Button
          variant="contained"
          size="small"
          component={RouterLink}
          to={`/teachers/${teacher.id}?${params.toString()}`}
        >
          Обрати час
        </Button>
      </CardActions>
    </Card>
  );
}
