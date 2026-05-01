'use client';

import { useMemo, useState } from 'react';
import type { DropDetailPageData } from '@/lib/ruehl/queries/drop';
import DropAuthor from '@/components/drop/DropAuthor';
import DropEchoes from '@/components/drop/DropEchoes';
import DropEngagementBar from '@/components/drop/DropEngagementBar';
import DropMedia from '@/components/drop/DropMedia';

type Props = {
  initial: DropDetailPageData;
};

export default function DropDetailView({ initial }: Props) {
  const [liftCount, setLiftCount] = useState(initial.drop.liftCount ?? 0);

  const drop = useMemo(() => initial.drop, [initial.drop]);
  const author = initial.author;
  const echoes = initial.echoes;

  const caption = String(drop.caption || '').trim();
  const hasAudio = Boolean(String(drop.audioPath || '').trim());

  return (
    <article className="pb-16">
      <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/80">
        <div className="border-b border-zinc-800/50 px-4 pt-4 pb-3">
          <DropAuthor drop={drop} author={author} embedded />
        </div>

        {hasAudio ? (
          <div className="border-b border-zinc-800/50 px-4 py-4">
            <DropMedia
              audioPath={drop.audioPath}
              audioVisibility={drop.audioVisibility}
              durationSeconds={drop.durationSeconds}
              embedded
            />
          </div>
        ) : null}

        {caption ? (
          <div className="border-b border-zinc-800/50 px-4 py-3">
            <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-200">{caption}</p>
          </div>
        ) : null}

        <div className="px-4 py-3">
          <DropEngagementBar
            dropId={drop.id}
            liftCount={liftCount}
            onLiftCountChange={setLiftCount}
            echoCount={initial.echoCount}
            embedded
          />
        </div>
      </div>

      <div className="mt-6">
        <DropEchoes echoes={echoes} />
      </div>
    </article>
  );
}
