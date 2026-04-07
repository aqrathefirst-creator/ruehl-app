export type SessionEnergy = 'CHILL' | 'FOCUSED' | 'INTENSE';

export type SessionAlignmentInput = {
  sessionIntent: string;
  preferredIntent?: string | null;
  sessionEnergy: SessionEnergy;
  preferredEnergy?: SessionEnergy | null;
  similarActivityHistory?: boolean;
  distanceKm?: number | null;
};

const normalize = (value: string | null | undefined) => (value || '').trim().toLowerCase();

export function computeSessionAlignment(input: SessionAlignmentInput) {
  let total = 0;

  if (
    normalize(input.sessionIntent) &&
    normalize(input.preferredIntent) &&
    normalize(input.sessionIntent) === normalize(input.preferredIntent)
  ) {
    total += 50;
  }

  if (input.preferredEnergy && input.sessionEnergy === input.preferredEnergy) {
    total += 30;
  }

  if (input.similarActivityHistory) {
    total += 20;
  }

  if (typeof input.distanceKm === 'number') {
    if (input.distanceKm <= 3) total += 20;
    else if (input.distanceKm <= 8) total += 14;
    else if (input.distanceKm <= 20) total += 8;
  }

  return total;
}

export type AlignmentStage = 'Early' | 'Developing' | 'Strong';

export function scoreToStage(score: number): AlignmentStage {
  if (score <= 30) return 'Early';
  if (score <= 70) return 'Developing';
  return 'Strong';
}
