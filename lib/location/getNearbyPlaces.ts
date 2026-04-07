import { supabase } from '@/lib/supabase';
import { getDistanceKm } from '@/lib/core/distance';

type PlaceType = 'gym' | 'healthy_food';

type PlaceRow = {
  id: string;
  name: string;
  type: PlaceType;
  lat: number;
  lng: number;
};

export type NearbyPlace = {
  id: string;
  name: string;
  type: PlaceType;
  distanceKm: number;
};

export async function getNearbyPlaces(userLat: number, userLng: number): Promise<NearbyPlace[]> {
  const { data, error } = await supabase
    .from('places')
    .select('id, name, type, lat, lng')
    .limit(500);

  if (error) {
    return [];
  }

  const places = ((data || []) as PlaceRow[])
    .map((place) => {
      const distance = getDistanceKm(userLat, userLng, place.lat, place.lng);
      return {
        id: place.id,
        name: place.name,
        type: place.type,
        distanceKm: Number(distance.toFixed(1)),
      };
    })
    .filter((place) => place.distanceKm <= 5)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 3);

  return places;
}
