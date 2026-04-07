'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type ChartRow = {
  sound_id: string | null;
  rank: number | null;
  movement?: string | null;
  lifecycle?: string | null;
  sounds: Array<{
    track_name: string | null;
    artist_name: string | null;
    title: string | null;
    artist: string | null;
  }> | null;
};

const movementSymbol = (movement: string | null | undefined) => {
  const normalized = (movement || '').trim().toLowerCase();
  const parsed = Number.parseInt(normalized.replace(/[^\d+-]/g, ''), 10);

  if (normalized.includes('up') || parsed > 0) return '▲';
  if (normalized.includes('down') || parsed < 0) return '▼';
  return '—';
};

export default function DesktopRightPanel() {
  const router = useRouter();
  const [charts, setCharts] = useState<ChartRow[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('chart_scores')
        .select('sound_id, rank, movement, lifecycle, sounds(track_name, artist_name, title, artist)')
        .order('rank', { ascending: true })
        .limit(8);

      setCharts((data as ChartRow[]) || []);
    };

    void load();
  }, []);

  const breakouts = charts.filter((row) => {
    const lifecycle = (row.lifecycle || '').trim().toLowerCase();
    return lifecycle === 'rising' || movementSymbol(row.movement) === '▲';
  }).slice(0, 4);

  return (
    <aside className="hidden lg:block lg:sticky lg:top-6 lg:h-[calc(100vh-1.5rem)] lg:overflow-y-auto lg:pr-2">
      <div className="space-y-6">
        <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Breakouts</h3>
            <button
              type="button"
              onClick={() => router.push('/charts')}
              className="text-xs text-gray-400 hover:text-white"
            >
              View
            </button>
          </div>

          <div className="space-y-2">
            {breakouts.length === 0 && <p className="text-xs text-gray-500">No breakout activity</p>}
            {breakouts.map((item, index) => (
              <button
                key={`${item.sounds?.[0]?.title || 'track'}-${index}`}
                type="button"
                onClick={() => (item.sound_id ? router.push(`/sound/${item.sound_id}`) : router.push('/charts'))}
                className="block w-full text-left"
              >
                <div className="truncate text-sm text-white">{item.sounds?.[0]?.track_name || item.sounds?.[0]?.title || ''}</div>
                <div className="text-xs text-gray-500">{item.sounds?.[0]?.artist_name || item.sounds?.[0]?.artist || ''}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Charts Preview</h3>
            <button
              type="button"
              onClick={() => router.push('/charts')}
              className="text-xs text-gray-400 hover:text-white"
            >
              Full
            </button>
          </div>

          <div className="space-y-2">
            {charts.slice(0, 5).map((item, index) => (
              <button
                key={`${item.rank || index}-${item.sounds?.[0]?.title || 'track'}`}
                type="button"
                onClick={() => (item.sound_id ? router.push(`/sound/${item.sound_id}`) : router.push('/charts'))}
                className="flex w-full items-baseline gap-2 text-left"
              >
                <span className="w-7 shrink-0 text-xs text-gray-500">#{item.rank || index + 1}</span>
                <span className="truncate text-sm text-white">{item.sounds?.[0]?.track_name || item.sounds?.[0]?.title || ''}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
