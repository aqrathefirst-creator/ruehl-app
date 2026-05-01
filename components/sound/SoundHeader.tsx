import Image from 'next/image';
import type { SoundDetailSound } from '@/lib/ruehl/queries/sound';

type Props = {
  sound: SoundDetailSound;
  /** Shown in subtitle — total usages when known, else list length */
  postCountLabel: number;
};

export default function SoundHeader({ sound, postCountLabel }: Props) {
  const title = sound.trackName?.trim() || 'Unknown track';
  const artist = sound.artistName?.trim() || 'Unknown artist';

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
        {sound.coverUrl ? (
          <Image src={sound.coverUrl} alt="" fill className="object-cover" unoptimized sizes="80px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-2xl text-zinc-500">♪</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-xl font-bold text-white">{title}</h1>
        <p className="truncate text-sm text-zinc-400">{artist}</p>
        <p className="mt-1 text-xs text-zinc-500">
          {postCountLabel} {postCountLabel === 1 ? 'post' : 'posts'}
        </p>
      </div>
    </div>
  );
}
