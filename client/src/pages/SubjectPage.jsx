import { Link as RouterLink, useLocation, useParams, useSearchParams } from 'react-router';
import { Button, Grid, Link, Stack, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PersonSearchOutlinedIcon from '@mui/icons-material/PersonSearchOutlined';
import { ApiError } from '../api/client.js';
import { academicApi, subjectsApi } from '../api/index.js';
import { AcademicSection } from '../components/AcademicSection.jsx';
import { DebtCard } from '../components/DebtCard.jsx';
import { DemoDataBanner } from '../components/DemoDataBanner.jsx';
import { GradesTable } from '../components/GradesTable.jsx';
import { PageState } from '../components/PageState.jsx';
import { SubjectTeacherCard } from '../components/SubjectTeacherCard.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';
import { useRequest } from '../hooks/useRequest.js';

const subjectNotFound = () => new ApiError(404, 'SUBJECT_NOT_FOUND', 'Дисципліну не знайдено');

// Заборгованості й оцінки студента з дисципліни (одна відповідь meta для обох запитів)
async function loadSubjectState() {
  const [debts, records] = await Promise.all([academicApi.debts('all'), academicApi.records()]);
  return { data: { debts: debts.data, records: records.data }, meta: debts.meta };
}

// Стан студента з дисципліни: заборгованість (з debtId – обрана, інакше відкриті) і оцінки
function SubjectState({ subjectId, debtId, from }) {
  const request = useRequest(loadSubjectState, '', 'subject-state');
  const pick = (data) => {
    const debts = data.debts.filter(
      (debt) =>
        debt.subject.id === subjectId &&
        (debt.id === debtId || (!debtId && debt.status === 'open')),
    );
    const records = data.records.filter((record) => record.subject.id === subjectId);
    return { debts, records };
  };

  return (
    <AcademicSection
      request={request}
      isEmpty={({ data }) => {
        const { debts, records } = pick(data);
        return debts.length === 0 && records.length === 0;
      }}
      emptyText="Заборгованостей і оцінок з цієї дисципліни немає"
    >
      {({ data }) => {
        const { debts, records } = pick(data);
        return (
          <Stack spacing={2}>
            {debts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} from={from} hideActions />
            ))}
            {records.length > 0 && <GradesTable records={records} hideActions />}
          </Stack>
        );
      }}
    </AcademicSection>
  );
}

// Дисципліна (FR-32, FR-33): стан студента з дисципліни і викладачі дисципліни в Session.
// Список викладачів не залежить від академічного джерела (дані Session).
export default function SubjectPage() {
  const params = useParams();
  const [search] = useSearchParams();
  const { state } = useLocation();
  const id = Number(params.id);
  const debtId = search.get('debtId') || undefined;
  const recordId = search.get('recordId') || undefined;
  const from = state?.from === 'dashboard' ? 'dashboard' : 'academic';

  const {
    data: subject,
    loading,
    error,
    reload,
  } = useRequest(
    () =>
      Number.isInteger(id) && id > 0 ? subjectsApi.get(id) : Promise.reject(subjectNotFound()),
    String(id),
    'subject',
  );
  usePageTitle(subject?.name ?? 'Дисципліна');

  const back =
    from === 'dashboard'
      ? { to: '/dashboard', label: 'Головна' }
      : { to: `/academic?tab=${recordId ? 'grades' : 'debts'}`, label: 'Успішність' };

  return (
    <>
      <Link
        component={RouterLink}
        to={back.to}
        underline="hover"
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mb: 2 }}
      >
        <ArrowBackIcon fontSize="small" /> {back.label}
      </Link>

      {!subject && (
        <PageState
          loading={loading}
          error={error}
          onRetry={error?.code === 'SUBJECT_NOT_FOUND' ? undefined : reload}
        />
      )}

      {subject && (
        <>
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' }, mb: 3 }}
          >
            {subject.name}
          </Typography>
          <DemoDataBanner />

          <Stack spacing={4}>
            <section>
              <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                Ваш стан з дисципліни
              </Typography>
              <SubjectState subjectId={subject.id} debtId={debtId} from={from} />
            </section>

            <section>
              <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
                Викладачі дисципліни
              </Typography>
              {subject.teachers.length === 0 ? (
                <PageState
                  empty
                  emptyText="Для цієї дисципліни немає викладачів у Session"
                  emptyIcon={PersonSearchOutlinedIcon}
                  emptyAction={
                    <Button variant="contained" component={RouterLink} to="/teachers">
                      Усі викладачі
                    </Button>
                  }
                />
              ) : (
                <Grid container spacing={2}>
                  {subject.teachers.map((teacher) => (
                    <Grid key={teacher.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <SubjectTeacherCard
                        teacher={teacher}
                        context={{ subjectId: subject.id, debtId, recordId }}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </section>
          </Stack>
        </>
      )}
    </>
  );
}
