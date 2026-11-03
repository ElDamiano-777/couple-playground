import { useEffect, useRef, useState } from 'react';
import { supabase } from './client';

type Pet = { id: string; name: string; kind: string };
type Food = { id: string; pet_id: string; name: string; brand: string; flavor: string; food_type: string; package_size: string; notes: string; photo: string | null };
export type PetFoodForShopping = Food & { petNames: string[] };

function groupFoods(foods: Food[], pets: Pet[]): PetFoodForShopping[] {
  const petNames = new Map(pets.map(pet => [pet.id, pet.name]));
  const groups = new Map<string, PetFoodForShopping>();
  const groupedPets = new Map<string, Set<string>>();
  for (const food of foods) {
    const petName = petNames.get(food.pet_id);
    if (!petName) continue;
    // Unbranded entries may be different products even when their names match.
    const key = food.brand.trim() ? JSON.stringify([food.name, food.brand, food.flavor, food.food_type, food.package_size, food.notes].map(value => (value ?? '').trim().toLocaleLowerCase())) : food.id;
    const existing = groups.get(key);
    if (!existing) { groups.set(key, { ...food, petNames: [petName] }); groupedPets.set(key, new Set([food.pet_id])); }
    else {
      if (!groupedPets.get(key)!.has(food.pet_id)) { existing.petNames.push(petName); groupedPets.get(key)!.add(food.pet_id); }
      if (!existing.photo && food.photo) { existing.id = food.id; existing.pet_id = food.pet_id; existing.photo = food.photo; }
    }
  }
  return [...groups.values()];
}

export function usePetFoodShopping(userId: string | undefined, household: string | null, enabled: boolean) {
  const [foods, setFoods] = useState<PetFoodForShopping[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const scope = `${userId ?? ''}:${household ?? ''}:${enabled}`;
  const current = useRef(scope);
  const loaded = useRef(scope);
  const generation = useRef(0);
  if (current.current !== scope) { current.current = scope; ++generation.current; }
  useEffect(() => {
    let active = true;
    loaded.current = scope;
    setFoods([]); setError('');
    if (!enabled || !userId || !household) { setLoading(false); return; }
    setLoading(true);
    const load = async () => {
      const request = ++generation.current;
      const petsResult = await supabase.from('family_profiles').select('id,name,kind').eq('household_id', household).eq('kind', 'pet');
      if (!active || current.current !== scope || request !== generation.current) return;
      if (petsResult.error) { setError('Could not load your pets’ food. Please try again.'); setLoading(false); return; }
      const pets = (petsResult.data as Pet[]).filter(pet => pet.kind === 'pet');
      if (!pets.length) { setFoods([]); setLoading(false); return; }
      const foodResult = await supabase.from('pet_food').select('id,pet_id,name,brand,flavor,food_type,package_size,notes,photo').in('pet_id', pets.map(pet => pet.id)).order('created_at');
      if (!active || current.current !== scope || request !== generation.current) return;
      if (foodResult.error) setError('Could not load your pets’ food. Please try again.');
      else { setFoods(groupFoods(foodResult.data as Food[], pets)); setError(''); }
      setLoading(false);
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { active = false; ++generation.current; clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [scope, userId, household, enabled, retry]);
  const sameScope = loaded.current === scope;
  return { foods: sameScope ? foods : [], loading: !sameScope || loading, error: sameScope ? error : '', retry: () => setRetry(value => value + 1) };
}
