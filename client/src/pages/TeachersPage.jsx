import { useEffect, useState } from 'react';
import { Link as RouterLink, useSearchParams } from 'react-router';
import {
  Autocomplete,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { subjectsApi, teachersApi } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { UserAvatar } from '../components/UserAvatar.jsx';
import { useRequest } from '../hooks/useRequest.js';

// Список викладачів із пошуком за ПІБ (FR-13) і фільтром за дисципліною (FR-32).
// Обрана дисципліна зберігається в адресі (?subjectId=) і передається на сторінку слотів.
export default function TeachersPage() {
  const [params, setParams] = useSearchParams();
  const subjectParam = Number(params.get('subjectId'));
  const subjectId = Number.isInteger(subjectParam) && subjectParam > 0 ? subjectParam : null;
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // Запит виконується через 300 мс після останнього введеного символу
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const subjectsRequest = useRequest(() => subjectsApi.list(), '', 'subjects');
  const subjects = subjectsRequest.data ?? [];
  const subject = subjects.find((s) => s.id === subjectId) ?? null;

  const { data, loading, error, reload } = useRequest(
    () => teachersApi.list({ search: query, subjectId }),
    `${query}|${subjectId ?? ''}`,
    'teachers',
  );
  const teachers = data ?? [];

  const setSubject = (value) => {
    const next = new URLSearchParams(params);
    if (value) next.set('subjectId', String(value.id));
    else next.delete('subjectId');
    setParams(next, { replace: true });
  };

  let emptyText = 'Викладачів не знайдено';
  if (query) emptyText = `Викладачів не знайдено за запитом «${query}»`;
  if (subject) emptyText += ` з дисципліни «${subject.name}»`;

  return (
    <>
      <PageHeader title="Викладачі" />
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3 }}>
        <TextField
          label="Пошук за ПІБ"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ maxWidth: { md: 420 } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
            htmlInput: { maxLength: 100 },
          }}
        />
        <Autocomplete
          options={subjects}
          value={subject}
          onChange={(_e, value) => setSubject(value)}
          getOptionLabel={(option) => option.name}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          loading={subjectsRequest.loading && !subjectsRequest.data}
          noOptionsText="Дисциплін не знайдено"
          loadingText="Завантаження…"
          fullWidth
          sx={{ maxWidth: { md: 420 } }}
          renderInput={(inputParams) => <TextField {...inputParams} label="Дисципліна" />}
        />
      </Stack>
      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        empty={teachers.length === 0}
        emptyText={emptyText}
      />
      {teachers.length > 0 && !error && (
        <Grid container spacing={2}>
          {teachers.map((teacher) => (
            <Grid key={teacher.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea
                  component={RouterLink}
                  to={`/teachers/${teacher.id}${subjectId ? `?subjectId=${subjectId}` : ''}`}
                  state={{ teacher }}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 1.5 }}>
                      <UserAvatar user={teacher} size={44} />
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" component="h2" sx={{ fontSize: '1.05rem' }}>
                          {teacher.fullName}
                        </Typography>
                        <Typography color="text.secondary" variant="body2">
                          {teacher.department || 'Кафедру не вказано'}
                        </Typography>
                      </Box>
                    </Stack>
                    {teacher.subjects?.length > 0 && (
                      <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                        {teacher.subjects.map((s) => (
                          <Chip
                            key={s.id}
                            size="small"
                            label={s.name}
                            color={s.id === subjectId ? 'primary' : 'default'}
                            variant={s.id === subjectId ? 'filled' : 'outlined'}
                          />
                        ))}
                      </Stack>
                    )}
                    <Typography color="primary" variant="body2" sx={{ fontWeight: 650, mt: 1.5 }}>
                      Переглянути слоти →
                    </Typography>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </>
  );
}
