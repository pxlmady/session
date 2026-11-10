import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import {
  Card,
  CardActionArea,
  CardContent,
  Grid,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { teachersApi } from '../api/index.js';
import { PageHeader } from '../components/PageHeader.jsx';
import { PageState } from '../components/PageState.jsx';
import { useRequest } from '../hooks/useRequest.js';

// Список викладачів із пошуком за ПІБ (FR-13)
export default function TeachersPage() {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  // Запит виконується через 300 мс після останнього введеного символу
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, reload } = useRequest(
    () => teachersApi.list(query),
    query,
    'teachers',
  );
  const teachers = data ?? [];

  return (
    <>
      <PageHeader title="Викладачі" />
      <TextField
        label="Пошук за ПІБ"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        fullWidth
        sx={{ mb: 3, maxWidth: { sm: 480 } }}
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
      <PageState
        loading={loading && !data}
        error={error}
        onRetry={reload}
        empty={teachers.length === 0}
        emptyText={
          query ? `Викладачів не знайдено за запитом «${query}»` : 'Викладачів не знайдено'
        }
      />
      {teachers.length > 0 && !error && (
        <Grid container spacing={2}>
          {teachers.map((teacher) => (
            <Grid key={teacher.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardActionArea
                  component={RouterLink}
                  to={`/teachers/${teacher.id}`}
                  state={{ teacher }}
                  sx={{ height: '100%' }}
                >
                  <CardContent>
                    <Typography variant="h6" component="h2" sx={{ fontSize: '1.1rem' }}>
                      {teacher.fullName}
                    </Typography>
                    <Typography color="text.secondary" variant="body2" sx={{ mb: 1 }}>
                      {teacher.department || 'Кафедру не вказано'}
                    </Typography>
                    <Typography color="primary" variant="body2">
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
