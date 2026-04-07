type NullableString = string | null | undefined;

type PostAlignmentInput = {
  genre?: NullableString;
  mood?: NullableString;
  activity?: NullableString;
};

type SoundAlignmentInput = {
  genre?: NullableString;
  mood?: NullableString;
  energy_level?: number | null | undefined;
};

const normalize = (value: NullableString) => (value || '').trim().toLowerCase();

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function inferPostAttributesFromCaption(caption: string) {
  const text = (caption || '').toLowerCase();

  let mood: string | null = null;
  let activity: string | null = null;

  if (/\b(gym|workout|training)\b/.test(text)) {
    activity = 'workout';
  }

  if (/\b(relax|chill)\b/.test(text)) {
    activity = 'chill';
  }

  if (/\b(night|alone|dark)\b/.test(text)) {
    mood = 'dark';
  }

  if (/\b(happy|fun|good vibes)\b/.test(text)) {
    mood = 'happy';
  }

  return {
    mood,
    activity,
  };
}

export function computeAlignmentScore(post: PostAlignmentInput, sound: SoundAlignmentInput) {
  let score = 0;

  const postGenre = normalize(post.genre);
  const soundGenre = normalize(sound.genre);
  const postMood = normalize(post.mood);
  const soundMood = normalize(sound.mood);
  const postActivity = normalize(post.activity);
  const energyLevel = Number(sound.energy_level || 0);

  if (postGenre && soundGenre && postGenre === soundGenre) score += 30;
  if (postMood && soundMood && postMood === soundMood) score += 25;

  if (postActivity === 'workout' && energyLevel >= 7) score += 20;
  if (postActivity === 'chill' && energyLevel > 0 && energyLevel <= 4) score += 20;

  score += 10;

  return clamp(score, 0, 100);
}
