import { formatDate } from '@/i18n/format';
import type { StaffUser } from './staff.types';

type CsvLabels = {
  name: string;
  email: string;
  phone: string;
  roles: string;
  created: string;
  status: string;
  active: string;
  blocked: string;
};

function csvCell(value: string): string {
  return /[",\n;]/u.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function usersToCsv(users: readonly StaffUser[], labels: CsvLabels): string {
  const header = [
    labels.name,
    labels.email,
    labels.phone,
    labels.roles,
    labels.created,
    labels.status,
  ];
  const rows = users.map((user) => [
    user.full_name ?? '',
    user.email,
    user.phone ?? '',
    user.roles.join(' '),
    formatDate(user.created_at),
    user.is_blocked ? labels.blocked : labels.active,
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}

export function downloadCsv(content: string, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}
