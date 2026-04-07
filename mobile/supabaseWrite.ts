import { supabase } from './supabase';
import { computeAlignmentScore, inferPostAttributesFromCaption } from '../lib/alignmentEngine';
import { computeFinalAlignmentScore, getSoundAdaptiveWeight, updateSoundAdaptiveWeight } from '../lib/adaptiveAlignment';

type EnsureSoundInput = {
  trackName: string;
  artistName: string;
  previewUrl?: string | null;
  coverUrl?: string | null;
  genre?: string | null;
  mood?: string | null;
  energyLevel?: number | null;
};

type CreatePostInput = {
  userId: string;
  content: string;
  mediaUrl?: string | null;
  genre?: string | null;
  mood?: string | null;
  activity?: string | null;
  trackName: string;
  artistName: string;
  previewUrl?: string | null;
  coverUrl?: string | null;
  soundGenre?: string | null;
  soundMood?: string | null;
  soundEnergyLevel?: number | null;
};

const getMissingColumnFromError = (message: string) => {
  const match = message.match(/column\s+"([^"]+)"/i);
  return match?.[1] || null;
};

async function createSoundWithFallback(payload: Record<string, unknown>) {
  const candidate = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { data, error } = await supabase
      .from('sounds')
      .insert(candidate)
      .select('id, usage_count, preview_url, cover_url, thumbnail_url, genre, mood, energy_level')
      .single();

    if (!error) return data as Record<string, unknown>;

    const missingColumn = getMissingColumnFromError(error.message || '');
    if (missingColumn && missingColumn in candidate) {
      delete (candidate as Record<string, unknown>)[missingColumn];
      continue;
    }

    throw error;
  }

  throw new Error('Unable to create sound after fallback attempts.');
}

async function updateSoundWithFallback(soundId: string, patch: Record<string, unknown>) {
  const candidate = { ...patch };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('sounds').update(candidate).eq('id', soundId);

    if (!error) return;

    const missingColumn = getMissingColumnFromError(error.message || '');
    if (missingColumn && missingColumn in candidate) {
      delete (candidate as Record<string, unknown>)[missingColumn];
      continue;
    }

    throw error;
  }

  throw new Error('Unable to update sound after fallback attempts.');
}

async function insertChartScoreWithFallback(payload: Record<string, unknown>) {
  const candidate = { ...payload };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('chart_scores').insert(candidate);

    if (!error) return;

    const missingColumn = getMissingColumnFromError(error.message || '');
    if (missingColumn && missingColumn in candidate) {
      delete (candidate as Record<string, unknown>)[missingColumn];
      continue;
    }

    throw error;
  }

  throw new Error('Unable to insert chart score after fallback attempts.');
}

async function updateChartScoreWithFallback(soundId: string, patch: Record<string, unknown>) {
  const candidate = { ...patch };

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const { error } = await supabase.from('chart_scores').update(candidate).eq('sound_id', soundId);

    if (!error) return;

    const missingColumn = getMissingColumnFromError(error.message || '');
    if (missingColumn && missingColumn in candidate) {
      delete (candidate as Record<string, unknown>)[missingColumn];
      continue;
    }

    throw error;
  }

  throw new Error('Unable to update chart score after fallback attempts.');
}

export async function ensureSoundInSupabase(input: EnsureSoundInput) {
  const trackName = input.trackName.trim();
  const artistName = input.artistName.trim();
  if (!trackName) throw new Error('track_name is required');

  const { data: byTrackArtist, error: lookupError } = await supabase
    .from('sounds')
    .select('id, usage_count, preview_url, cover_url, thumbnail_url, genre, mood, energy_level')
    .eq('track_name', trackName)
    .eq('artist_name', artistName)
    .limit(1)
    .maybeSingle();

  if (lookupError && lookupError.code !== 'PGRST116') throw lookupError;

  if (byTrackArtist) {
    await updateSoundWithFallback(byTrackArtist.id, {
      usage_count: (byTrackArtist.usage_count || 0) + 1,
      preview_url: byTrackArtist.preview_url || input.previewUrl || null,
      cover_url: byTrackArtist.cover_url || input.coverUrl || null,
      thumbnail_url: byTrackArtist.thumbnail_url || input.coverUrl || null,
      genre: byTrackArtist.genre || input.genre || null,
      mood: byTrackArtist.mood || input.mood || null,
      energy_level: byTrackArtist.energy_level || input.energyLevel || null,
    });
    return byTrackArtist.id as string;
  }

  const created = await createSoundWithFallback({
    track_name: trackName,
    artist_name: artistName,
    preview_url: input.previewUrl || null,
    cover_url: input.coverUrl || null,
    thumbnail_url: input.coverUrl || null,
    genre: input.genre || null,
    mood: input.mood || null,
    energy_level: input.energyLevel || null,
    usage_count: 1,
  });

  return (created.id as string) || null;
}

export async function touchChartScoreForSound(soundId: string) {
  const nowIso = new Date().toISOString();

  const { data: existing, error } = await supabase
    .from('chart_scores')
    .select('sound_id')
    .eq('sound_id', soundId)
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;

  if (existing) {
    await updateChartScoreWithFallback(soundId, { updated_at: nowIso });
    return;
  }

  const candidates: Array<Record<string, unknown>> = [
    { sound_id: soundId, rank: 20, movement: '+0', lifecycle: 'birth', updated_at: nowIso },
    { sound_id: soundId, rank: 20, updated_at: nowIso },
    { sound_id: soundId, updated_at: nowIso },
    { sound_id: soundId },
  ];

  for (const candidate of candidates) {
    try {
      await insertChartScoreWithFallback(candidate);
      return;
    } catch (insertError: unknown) {
      if (
        typeof insertError === 'object' &&
        insertError !== null &&
        'code' in insertError &&
        (insertError as { code?: string }).code === '23505'
      ) {
        await updateChartScoreWithFallback(soundId, { updated_at: nowIso });
        return;
      }
    }
  }

  throw new Error('Unable to sync chart score for sound.');
}

export async function createPostWithSupabaseSound(input: CreatePostInput) {
  const inferred = inferPostAttributesFromCaption(input.content || '');
  const resolvedGenre = (input.genre || '').trim() || null;
  const resolvedMood = (input.mood || '').trim() || inferred.mood || null;
  const resolvedActivity = (input.activity || '').trim() || inferred.activity || null;

  const soundId = await ensureSoundInSupabase({
    trackName: input.trackName,
    artistName: input.artistName,
    previewUrl: input.previewUrl,
    coverUrl: input.coverUrl,
    genre: input.soundGenre || resolvedGenre,
    mood: input.soundMood || resolvedMood,
    energyLevel: input.soundEnergyLevel || null,
  });

  const { data: soundMeta } = await supabase
    .from('sounds')
    .select('id, genre, mood, energy_level')
    .eq('id', soundId)
    .maybeSingle();

  const alignmentScore = computeAlignmentScore(
    {
      genre: resolvedGenre,
      mood: resolvedMood,
      activity: resolvedActivity,
    },
    {
      genre: soundMeta?.genre || input.soundGenre || resolvedGenre,
      mood: soundMeta?.mood || input.soundMood || resolvedMood,
      energy_level: soundMeta?.energy_level || input.soundEnergyLevel || null,
    }
  );

  const adaptiveWeight = await getSoundAdaptiveWeight(
    supabase as unknown as Parameters<typeof getSoundAdaptiveWeight>[0],
    soundId
  );
  const finalAlignmentScore = computeFinalAlignmentScore(alignmentScore, adaptiveWeight);

  const payload: Record<string, unknown> = {
    user_id: input.userId,
    content: input.content,
    media_url: input.mediaUrl || null,
    genre: resolvedGenre,
    mood: resolvedMood,
    activity: resolvedActivity,
    alignment_score: finalAlignmentScore,
    likes_count: 0,
    comments_count: 0,
    lifts_count: 0,
    track_name: input.trackName,
    artist_name: input.artistName,
    audio_url: input.previewUrl || null,
    sound_id: soundId,
  };

  const { error: postError } = await supabase.from('posts').insert(payload);
  if (postError) throw postError;

  await touchChartScoreForSound(soundId);
  await updateSoundAdaptiveWeight(
    supabase as unknown as Parameters<typeof updateSoundAdaptiveWeight>[0],
    soundId
  );

  return { soundId };
}
