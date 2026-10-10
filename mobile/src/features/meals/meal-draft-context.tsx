import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import type { MealPhoto } from '@/features/meals/meal-photo';

export const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;

export type MealType = (typeof mealTypes)[number];

export type MealDraft = {
  carbohydrates: number;
  mealName: string;
  mealTime: Date;
  mealType: MealType;
  photo: MealPhoto;
};

type MealDraftContextValue = {
  discardDraft: () => void;
  draft: MealDraft | null;
  startDraft: (photo: MealPhoto) => void;
  updateDraft: (changes: Partial<Omit<MealDraft, 'photo'>>) => void;
  updatePhoto: (photo: MealPhoto) => void;
};

const MealDraftContext = createContext<MealDraftContextValue | null>(null);

function mealTypeForTime(date: Date): MealType {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) return 'Breakfast';
  if (hour >= 11 && hour < 16) return 'Lunch';
  if (hour >= 16 && hour < 22) return 'Dinner';
  return 'Snack';
}

export function MealDraftProvider({ children }: PropsWithChildren) {
  const [draft, setDraft] = useState<MealDraft | null>(null);

  const value = useMemo<MealDraftContextValue>(
    () => ({
      draft,
      startDraft(photo) {
        const mealTime = new Date();
        setDraft({ carbohydrates: 0, mealName: '', mealTime, mealType: mealTypeForTime(mealTime), photo });
      },
      updateDraft(changes) {
        setDraft((current) => (current ? { ...current, ...changes } : current));
      },
      updatePhoto(photo) {
        setDraft((current) => (current ? { ...current, photo } : current));
      },
      discardDraft() {
        setDraft(null);
      },
    }),
    [draft],
  );

  return <MealDraftContext.Provider value={value}>{children}</MealDraftContext.Provider>;
}

export function useMealDraft() {
  const value = useContext(MealDraftContext);

  if (!value) {
    throw new Error('useMealDraft must be used inside MealDraftProvider.');
  }

  return value;
}
