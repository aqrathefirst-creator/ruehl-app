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

  return (
    <article className="pb-16">
      <DropMedia
        audioPath={drop.audioPath}
        audioVisibility={drop.audioVisibility}
        durationSeconds={drop.durationSeconds}
      />
      <div className="mt-4">
        <DropAuthor drop={drop} author={author} />
      </div>
      {caption ? (
        <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-200">{caption}</p>
      ) : null}
      <DropEngagementBar
        dropId={drop.id}
        liftCount={liftCount}
        onLiftCountChange={setLiftCount}
        echoCount={initial.echoCount}
      />
      <DropEchoes echoes={echoes} />
    </article>
  );
}
