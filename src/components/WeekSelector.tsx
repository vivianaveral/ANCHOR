'use client';

import type { SnapshotListItem } from '@/lib/types';

interface Props {
  snapshots: SnapshotListItem[];
  selectedId: string | null;
  onChange: (id: string) => void;
}

function formatWeekLabel(item: SnapshotListItem): string {
  const d = new Date(item.weekStart);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  const day = dayNames[d.getUTCDay()];
  const date = d.getUTCDate().toString().padStart(2, '0');
  const month = monthNames[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  const type = item.isManualUpload ? 'Manual' : 'Auto';

  return `Week of ${day} ${date} ${month} ${year} (${type})`;
}

export default function WeekSelector({ snapshots, selectedId, onChange }: Props) {
  if (snapshots.length === 0) {
    return (
      <span className="text-sm text-gray-500">No snapshots available</span>
    );
  }

  return (
    <select
      value={selectedId ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="bg-gray-800 text-gray-200 text-sm rounded-md px-3 py-2 border border-gray-700 focus:outline-none focus:ring-1 focus:ring-amber-400"
    >
      {snapshots.map((snap) => (
        <option key={snap.id} value={snap.id}>
          {formatWeekLabel(snap)}
        </option>
      ))}
    </select>
  );
}
