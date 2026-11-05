import { Link } from '@mui/material';

// Місце проведення: посилання на відеозустріч відкривається в новій вкладці
export function Location({ value }) {
  if (!value) return 'Місце не вказано';
  if (/^https?:\/\//i.test(value)) {
    return (
      <Link href={value} target="_blank" rel="noopener noreferrer" sx={{ wordBreak: 'break-all' }}>
        {value}
      </Link>
    );
  }
  return value;
}
