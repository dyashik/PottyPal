import { create } from 'zustand';
import { Place } from '@/utils/api'; // adjust path

interface PlaceStore {
  selectedPlace: Place | null;
  setSelectedPlace: (place: Place) => void;
}

export const usePlaceStore = create<PlaceStore>((set) => ({
  selectedPlace: null,
  setSelectedPlace: (place) => set({ selectedPlace: place }),
}));