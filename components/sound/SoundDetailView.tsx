import SoundHeader from '@/components/sound/SoundHeader';
import SoundPostList from '@/components/sound/SoundPostList';
import type { SoundDetailPageData } from '@/lib/ruehl/queries/sound';

type Props = {
  initial: SoundDetailPageData;
};

export default function SoundDetailView({ initial }: Props) {
  const { sound, posts } = initial;
  const postCountLabel =
    sound.usageCount != null && sound.usageCount > 0 ? sound.usageCount : posts.length;

  return (
    <article>
      <SoundHeader sound={sound} postCountLabel={postCountLabel} />

      <div className="mt-6">
        <h2 className="mb-4 text-lg font-semibold text-white">Posts using this sound</h2>
        <SoundPostList posts={posts} />
      </div>
    </article>
  );
}
