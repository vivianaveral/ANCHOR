'use client';

import { useEffect, useState, useRef } from 'react';
import type { SnapshotListItem, FullSnapshotData, AISynthesis } from '@/lib/types';
import WeekSelector from '@/components/WeekSelector';
import WeeklyBrief from '@/components/WeeklyBrief';
import DealRiskRadar from '@/components/DealRiskRadar';
import RepCoachingCards from '@/components/RepCoachingCards';

type ActiveView = 'brief' | 'radar' | 'cards';

export default function HomePage() {
  const [snapshots, setSnapshots] = useState<SnapshotListItem[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<FullSnapshotData | null>(null);
  const [activeView, setActiveView] = useState<ActiveView>('brief');
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);

  const gongFileRef = useRef<HTMLInputElement>(null);
  const hubspotFileRef = useRef<HTMLInputElement>(null);

  async function loadSnapshots() {
    try {
      const res = await fetch('/api/snapshots');
      if (!res.ok) throw new Error('Failed to load snapshots');
      const data = (await res.json()) as SnapshotListItem[];
      setSnapshots(data);
      if (data.length > 0 && !selectedSnapshotId) {
        setSelectedSnapshotId(data[0].id);
      }
    } catch {
      setUploadStatus('Failed to load snapshots.');
    }
  }

  useEffect(() => {
    void loadSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedSnapshotId) {
      setSnapshot(null);
      return;
    }
    setLoading(true);
    fetch(`/api/snapshot/${selectedSnapshotId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Snapshot not found');
        return res.json() as Promise<FullSnapshotData>;
      })
      .then((data) => {
        setSnapshot(data);
      })
      .catch(() => {
        setSnapshot(null);
        setUploadStatus('Failed to load snapshot data.');
      })
      .finally(() => setLoading(false));
  }, [selectedSnapshotId]);

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const gongFile = gongFileRef.current?.files?.[0];
    const hubspotFile = hubspotFileRef.current?.files?.[0];

    if (!gongFile || !hubspotFile) {
      setUploadStatus('Please select both a Gong CSV and a HubSpot CSV file.');
      return;
    }

    setUploadStatus('Uploading and generating brief...');
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('gongCsv', gongFile);
      formData.append('hubspotCsv', hubspotFile);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Upload failed');
      }

      const { snapshotId } = (await res.json()) as { snapshotId: string };
      setUploadStatus('Upload successful!');
      await loadSnapshots();
      setSelectedSnapshotId(snapshotId);
      setUploadOpen(false);

      // Reset file inputs
      if (gongFileRef.current) gongFileRef.current.value = '';
      if (hubspotFileRef.current) hubspotFileRef.current.value = '';
    } catch (err) {
      setUploadStatus(`Upload failed: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }

  const synthesis: AISynthesis | null = snapshot?.aiSynthesis
    ? (JSON.parse(snapshot.aiSynthesis) as AISynthesis)
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-amber-400 font-bold text-2xl tracking-tight">
              ANCHOR
            </span>
            <span className="text-white text-xl ml-2">Coaching Intelligence</span>
            <span className="text-gray-500 text-sm ml-3">BruntWork Internal</span>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Tab bar + Week selector row */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex gap-1">
            {(
              [
                { key: 'brief', label: 'Weekly Brief' },
                { key: 'radar', label: 'Deal Risk Radar' },
                { key: 'cards', label: 'Rep Coaching Cards' },
              ] as { key: ActiveView; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveView(key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeView === key
                    ? 'bg-amber-400 text-gray-950'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <WeekSelector
            snapshots={snapshots}
            selectedId={selectedSnapshotId}
            onChange={setSelectedSnapshotId}
          />
        </div>

        {/* Manual upload section */}
        <div className="mb-6">
          <button
            onClick={() => setUploadOpen((prev) => !prev)}
            className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2"
          >
            {uploadOpen ? 'Hide upload' : 'Upload Gong CSV + HubSpot CSV'}
          </button>

          {uploadOpen && (
            <form
              onSubmit={(e) => void handleUpload(e)}
              className="mt-3 bg-gray-900 border border-gray-700 rounded-lg p-4 flex flex-wrap gap-4 items-end"
            >
              <div>
                <label className="block text-xs text-gray-400 mb-1">Gong CSV</label>
                <input
                  ref={gongFileRef}
                  type="file"
                  accept=".csv"
                  className="text-sm text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">HubSpot CSV</label>
                <input
                  ref={hubspotFileRef}
                  type="file"
                  accept=".csv"
                  className="text-sm text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-gray-700 file:text-gray-200 hover:file:bg-gray-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-amber-400 text-gray-950 font-medium text-sm rounded-md hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Generate Brief'}
              </button>
            </form>
          )}

          {uploadStatus && (
            <p className="mt-2 text-sm text-gray-400">{uploadStatus}</p>
          )}
        </div>

        {/* Main content */}
        {loading && !snapshot ? (
          <div className="flex items-center justify-center py-24">
            <p className="text-gray-500 text-lg">Loading...</p>
          </div>
        ) : !snapshot ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-gray-500 text-lg">No snapshot selected.</p>
            <p className="text-gray-600 text-sm">
              Run the weekly sync or upload CSV files to get started.
            </p>
          </div>
        ) : (
          <div>
            {activeView === 'brief' && (
              <WeeklyBrief
                synthesis={synthesis}
                repScores={snapshot.repScores}
              />
            )}
            {activeView === 'radar' && (
              <DealRiskRadar
                repScores={snapshot.repScores}
                dealSnapshots={snapshot.dealSnapshots}
              />
            )}
            {activeView === 'cards' && (
              <RepCoachingCards
                repScores={snapshot.repScores}
                synthesis={synthesis}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
