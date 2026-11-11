import { useState } from 'react';
import { useSearchParams } from 'react-router';
import {
  Box,
  Card,
  CardContent,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import GradingOutlinedIcon from '@mui/icons-material/GradingOutlined';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import { academicApi } from '../api/index.js';
import { AcademicSection } from '../components/AcademicSection.jsx';
import { DebtCard } from '../components/DebtCard.jsx';
import { DemoDataBanner } from '../components/DemoDataBanner.jsx';
import { GradesTable } from '../components/GradesTable.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { useAuth } from '../context/auth-context.js';
import { useRequest } from '../hooks/useRequest.js';
import { formatDate } from '../utils/datetime.js';
import { providerLabel } from '../utils/labels.js';

const TABS = ['profile', 'grades', 'debts'];

function ProfileRow({ label, value }) {
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0, sm: 2 }}>
      <Typography color="text.secondary" sx={{ minWidth: { sm: 200 } }}>
        {label}
      </Typography>
      <Typography sx={{ wordBreak: 'break-word' }}>{value}</Typography>
    </Stack>
  );
}

// FR-28: академічний профіль
function ProfileTab() {
  const { user } = useAuth();
  const request = useRequest(() => academicApi.profile(), '', 'academic-profile');
  return (
    <AcademicSection request={request}>
      {({ data: profile, meta }) => (
        <Card variant="outlined" sx={{ maxWidth: 720 }}>
          <CardContent>
            <Stack spacing={1.5}>
              <ProfileRow label="ПІБ" value={user.fullName} />
              <ProfileRow label="Група" value={profile.group} />
              <ProfileRow label="Інститут" value={profile.institute} />
              <ProfileRow label="Спеціальність" value={profile.specialty} />
              <ProfileRow label="Курс" value={profile.course} />
              <ProfileRow label="Форма навчання" value={profile.studyForm} />
              {profile.averageScore !== null && (
                <ProfileRow label="Середній бал" value={profile.averageScore} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Джерело: {providerLabel(meta.provider)}
              {meta.dataAsOf ? `, дані станом на ${formatDate(meta.dataAsOf)}` : ''}
            </Typography>
          </CardContent>
        </Card>
      )}
    </AcademicSection>
  );
}

// FR-29: оцінки за обраний семестр (за замовчуванням – останній)
function GradesTab() {
  const request = useRequest(() => academicApi.records(), '', 'academic-records');
  const [semester, setSemester] = useState('');

  return (
    <AcademicSection
      request={request}
      isEmpty={({ data }) => data.length === 0}
      emptyText="Оцінок немає"
      emptyIcon={GradingOutlinedIcon}
    >
      {({ data: records }) => {
        const semesters = [...new Set(records.map((record) => record.semester))].sort(
          (a, b) => b - a,
        );
        const current = semesters.includes(semester) ? semester : semesters[0];
        const shown = records.filter((record) => record.semester === current);
        return (
          <>
            <FormControl size="small" sx={{ mb: 2, minWidth: 180 }}>
              <InputLabel id="semester-label">Семестр</InputLabel>
              <Select
                labelId="semester-label"
                label="Семестр"
                value={current}
                onChange={(e) => setSemester(e.target.value)}
              >
                {semesters.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value} семестр
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <GradesTable records={shown} />
          </>
        );
      }}
    </AcademicSection>
  );
}

// FR-30: заборгованості; за замовчуванням лише відкриті
function DebtsTab() {
  const [onlyOpen, setOnlyOpen] = useState(true);
  const status = onlyOpen ? 'open' : 'all';
  const request = useRequest(() => academicApi.debts(status), status, 'academic-debts');

  return (
    <>
      <FormControlLabel
        control={<Switch checked={onlyOpen} onChange={(e) => setOnlyOpen(e.target.checked)} />}
        label="Лише відкриті"
        sx={{ mb: 2 }}
      />
      <AcademicSection
        request={request}
        isEmpty={({ data }) => data.length === 0}
        emptyText={onlyOpen ? 'Відкритих заборгованостей немає' : 'Заборгованостей немає'}
        emptyIcon={TaskAltIcon}
      >
        {({ data: debts }) => (
          <Box
            sx={{
              display: 'grid',
              gap: 2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
            }}
          >
            {debts.map((debt) => (
              <DebtCard key={debt.id} debt={debt} from="academic" showSubjectLink />
            ))}
          </Box>
        )}
      </AcademicSection>
    </>
  );
}

// Успішність (FR-28 – FR-30): профіль, оцінки, заборгованості. Дані лише для читання.
// Активна вкладка зберігається в параметрі ?tab=.
export default function AcademicPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'profile';

  return (
    <>
      <PageHeader title="Успішність" />
      <DemoDataBanner />
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_e, value) => setParams({ tab: value }, { replace: true })}
          variant="scrollable"
          allowScrollButtonsMobile
        >
          <Tab value="profile" label="Профіль" />
          <Tab value="grades" label="Оцінки" />
          <Tab value="debts" label="Заборгованості" />
        </Tabs>
      </Box>
      {tab === 'profile' && <ProfileTab />}
      {tab === 'grades' && <GradesTab />}
      {tab === 'debts' && <DebtsTab />}
    </>
  );
}
