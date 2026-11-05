import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../shared/client';

export type MealSlot = 'Breakfast' | 'Lunch' | 'Dinner';
export type MealPlanItem = { id: string; household_id: string; week_start: string; day_index: number; meal_slot: MealSlot; recipe_id: string | null; title: string; created_at: string };
// Keep all meal types in the data model; this household currently plans dinner only.
export const activeMealSlots: MealSlot[] = ['Dinner'];
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const monday = (date = new Date()) => { const value = new Date(date); const offset = (value.getDay() + 6) % 7; value.setHours(0, 0, 0, 0); value.setDate(value.getDate() - offset); return localDate(value); };
const failure = 'We couldn’t update your meal plan. Check your connection and try again.';

export function useMealPlan({ userId, household }: { userId?: string; household: string | null }) {
  const [weekStart, setWeekStart] = useState(monday);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const refresh = useCallback(async () => {
    if (!userId || !household) { setItems([]); return; }
    setLoading(true);
    try {
      const result = await supabase.from('meal_plan_items').select('*').eq('household_id', household).eq('week_start', weekStart).order('day_index').order('meal_slot');
      if (result.error) throw result.error;
      setItems(result.data as MealPlanItem[]); setError('');
    } catch { setError(failure); }
    finally { setLoading(false); }
  }, [household, userId, weekStart]);
  useEffect(() => {
    void refresh(); const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    const focus = () => { if (!document.hidden) void refresh(); };
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); };
  }, [refresh]);
  const save = async (item: { id?: string; dayIndex: number; mealSlot: MealSlot; recipeId: string | null; title: string }) => {
    if (!household || busy || !navigator.onLine) return false;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await supabase.rpc('save_meal_plan_item', { p_id: item.id ?? null, p_week_start: weekStart, p_day_index: item.dayIndex, p_meal_slot: item.mealSlot, p_recipe_id: item.recipeId, p_title: item.title });
      if (result.error) throw result.error;
      const saved = result.data as MealPlanItem;
      setItems(previous => [...previous.filter(row => row.id !== saved.id && !(row.day_index === saved.day_index && row.meal_slot === saved.meal_slot)), saved]);
      setNotice('Meal plan saved.'); return true;
    } catch { setError(failure); return false; }
    finally { setBusy(false); }
  };
  const remove = async (item: MealPlanItem) => {
    if (busy || !navigator.onLine) return false;
    setBusy(true); setError('');
    try { const result = await supabase.from('meal_plan_items').delete().eq('id', item.id).eq('household_id', item.household_id).select('id').single(); if (result.error) throw result.error; setItems(previous => previous.filter(row => row.id !== item.id)); setNotice('Meal removed.'); return true; }
    catch { setError(failure); return false; } finally { setBusy(false); }
  };
  return { weekStart, setWeekStart, items, loading, busy, error, notice, refresh, save, remove };
}

export type MealPlanState = ReturnType<typeof useMealPlan>;
