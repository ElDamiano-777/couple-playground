import { useState } from 'react';
import type { SharedShoppingState } from './useSharedShopping';
import { usePetFoodShopping } from './usePetFoodShopping';
import { Symbol } from '../ui/Symbol';

export default function PetFoodShopping({ state }: { state: SharedShoppingState }) {
  const [added, setAdded] = useState('');
  const { foods, loading, error, retry } = usePetFoodShopping(state.session?.user.id, state.household, true);
  return <section className="pet-food-shopping" aria-labelledby="pet-food-shopping-title">
    <h2 id="pet-food-shopping-title">Our Pets’ Food</h2>
    {added && <p role="status">{added}</p>}
    {loading && <p role="status">Loading saved pet food…</p>}
    {error && <><p className="feedback error-message" role="alert">{error}</p><button className="text-action" onClick={retry}>Try again</button></>}
    {!loading && !error && foods.length === 0 && <p>Food saved in your pets’ profiles will appear here.</p>}
    <div className="pet-food-shopping-list">{foods.map(food => <article className="pet-food-shopping-card" key={food.id}>
      <div className="pet-food-shopping-info"><span className="pet-food-shopping-photo" aria-hidden="true">{food.photo ? <img src={food.photo} alt="" /> : <Symbol name="shopping" />}</span>
        <div><strong>{food.name}</strong><span>{[food.brand, food.flavor, food.food_type === 'Dry' ? 'Dry Food' : food.food_type === 'Wet' ? 'Wet Food' : food.food_type, food.package_size].filter(Boolean).join(' · ')}</span><small>For {food.petNames.join(' & ')}</small>{food.notes && <small className="pet-food-saved-notes">{food.notes}</small>}</div></div>
      <button className="pet-food-shopping-add" disabled={state.busy || !navigator.onLine} aria-label={`Add ${food.name} for ${food.petNames.join(' and ')} to Shopping`} onClick={() => { setAdded(''); void state.addPetFood(food).then(success => { if (success) setAdded(`${food.name} added to your Pets list.`); }); }}>+ Add to Shopping</button>
    </article>)}</div>
  </section>;
}
