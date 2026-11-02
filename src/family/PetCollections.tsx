import { useEffect, useRef, useState, type FormEvent } from 'react';
import { supabase } from '../shared/client';
import { readPhoto } from './petPhoto';

type Food = { id: string; pet_id: string; photo: string | null; brand: string; name: string; flavor: string; food_type: string; notes: string; package_size: string };
type Dislike = { id: string; pet_id: string; ingredient: string; food_type: string; notes: string };
type FoodDraft = Omit<Food, 'id' | 'pet_id'>;
type DislikeDraft = Omit<Dislike, 'id' | 'pet_id'>;
const emptyFood = (): FoodDraft => ({ photo: null, brand: '', name: '', flavor: '', food_type: '', notes: '', package_size: '' });
const emptyDislike = (): DislikeDraft => ({ ingredient: '', food_type: '', notes: '' });
const types = ['Wet', 'Dry', 'Treats', 'Other'];

function FoodType({ value, onChange, required = false }: { value: string; onChange: (value: string) => void; required?: boolean }) {
  return <><label htmlFor="food-type">Food type</label><select id="food-type" required={required} value={value} onChange={event => onChange(event.target.value)}>
    <option value="">Choose a food type</option>{types.map(type => <option key={type} value={type}>{type}</option>)}
    {value && !types.includes(value) && <option value={value}>{value} (saved)</option>}
  </select></>;
}

export default function PetCollections({ petId, initialTab, onBack }: { petId: string; initialTab: 'food' | 'dislikes'; onBack: () => void }) {
  const [tab, setTab] = useState(initialTab);
  const generation = useRef(0);
  const [foods, setFoods] = useState<Food[]>([]);
  const [dislikes, setDislikes] = useState<Dislike[]>([]);
  const [food, setFood] = useState<FoodDraft>(emptyFood);
  const [dislike, setDislike] = useState<DislikeDraft>(emptyDislike);
  const [editingFood, setEditingFood] = useState<string | null>(null);
  const [editingDislike, setEditingDislike] = useState<string | null>(null);
  const [foodForm, setFoodForm] = useState(false);
  const [dislikeForm, setDislikeForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      const request = ++generation.current;
      const [f, d] = await Promise.all([
        supabase.from('pet_food').select('*').eq('pet_id', petId).order('created_at'),
        supabase.from('pet_dislikes').select('*').eq('pet_id', petId).order('created_at'),
      ]);
      if (!active || request !== generation.current) return;
      if (f.error || d.error) setError('Could not load this collection. Please check your connection.');
      else { setFoods(f.data as Food[]); setDislikes(d.data as Dislike[]); setError(''); }
      setLoading(false);
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', refresh);
    return () => { active = false; ++generation.current; window.removeEventListener('focus', refresh); };
  }, [petId]);

  async function choosePhoto(file?: File) {
    if (!file) return;
    setPhotoLoading(true); setError('');
    try {
      const photo = await readPhoto(file);
      if (photo.length > 1400000) throw new Error('Photo too large');
      setFood(previous => ({ ...previous, photo }));
    } catch { setError('Could not open this photo. Please choose another image.'); }
    finally { setPhotoLoading(false); }
  }
  async function saveFood(event: FormEvent) {
    event.preventDefault(); ++generation.current; setBusy(true); setError('');
    const values = { ...food, name: food.name.trim() };
    const query = editingFood
      ? supabase.from('pet_food').update(values).eq('id', editingFood).eq('pet_id', petId)
      : supabase.from('pet_food').insert({ ...values, pet_id: petId });
    const result = await query.select().single();
    if (result.error) setError('Could not save food. Your changes are still here.');
    else { setFoods(rows => [...rows.filter(row => row.id !== result.data.id), result.data as Food]); setFoodForm(false); setEditingFood(null); setFood(emptyFood()); }
    setBusy(false);
  }
  async function saveDislike(event: FormEvent) {
    event.preventDefault(); ++generation.current; setBusy(true); setError('');
    const values = { ...dislike, ingredient: dislike.ingredient.trim() };
    const query = editingDislike
      ? supabase.from('pet_dislikes').update(values).eq('id', editingDislike).eq('pet_id', petId)
      : supabase.from('pet_dislikes').insert({ ...values, pet_id: petId });
    const result = await query.select().single();
    if (result.error) setError('Could not save this dislike. Your changes are still here.');
    else { setDislikes(rows => [...rows.filter(row => row.id !== result.data.id), result.data as Dislike]); setDislikeForm(false); setEditingDislike(null); setDislike(emptyDislike()); }
    setBusy(false);
  }
  async function remove(table: 'pet_food' | 'pet_dislikes', id: string, name: string) {
    if (!window.confirm(`Remove “${name}” for both of you?`)) return;
    ++generation.current; setBusy(true); setError('');
    const result = await supabase.from(table).delete().eq('id', id).eq('pet_id', petId).select('id').single();
    if (result.error) setError('Could not remove this item. Please try again.');
    else if (table === 'pet_food') setFoods(rows => rows.filter(row => row.id !== id));
    else setDislikes(rows => rows.filter(row => row.id !== id));
    setBusy(false);
  }
  function switchTab(next: 'food' | 'dislikes') { setTab(next); setError(''); }
  return <>
    <button className="text-action" onClick={onBack}>← Pets</button>
    <nav className="pet-tabs" aria-label="Pet collections">
      <button aria-current={tab === 'food' ? 'page' : undefined} onClick={() => switchTab('food')}>My Food</button>
      <button aria-current={tab === 'dislikes' ? 'page' : undefined} onClick={() => switchTab('dislikes')}>Food Preferences</button>
    </nav>
    {error && <p className="feedback error-message" role="alert">{error}</p>}
    {loading && <p role="status">Loading collection…</p>}
    {tab === 'food' && <><h2>My Food</h2><div className="food-grid">{foods.map(item => <article className="food-product" key={item.id}>
      <div className="food-product-photo">{item.photo ? <img src={item.photo} alt={`${item.name} packaging`} /> : <span aria-hidden="true">✦</span>}</div>
      <div className="food-product-body"><div className="food-product-heading"><div>{item.brand && <p className="food-product-brand">{item.brand}</p>}<h3>{item.name}</h3></div>
        <details className="food-menu"><summary aria-label={`Actions for ${item.name}`}>⋯</summary><div className="food-menu-options">
          <button disabled={busy} aria-label={`Edit ${item.name}`} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); setEditingFood(item.id); setFood({ photo: item.photo, brand: item.brand, name: item.name, flavor: item.flavor, food_type: item.food_type, notes: item.notes ?? '', package_size: item.package_size ?? '' }); setFoodForm(true); }}>Edit</button>
          <button disabled={busy} aria-label={`Remove ${item.name}`} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); void remove('pet_food', item.id, item.name); }}>Remove</button>
        </div></details></div>
        <p className="food-product-meta">{[item.flavor, item.food_type === 'Dry' ? 'Dry Food' : item.food_type === 'Wet' ? 'Wet Food' : item.food_type, item.package_size].filter(Boolean).join(' · ')}</p>{item.notes && <p className="pet-notes">{item.notes}</p>}
      </div>
    </article>)}</div>{!loading && foods.length === 0 && <p>No food saved yet.</p>}
    {!foodForm && <button className="primary" disabled={loading} onClick={() => { setEditingFood(null); setFood(emptyFood()); setFoodForm(true); }}>+ Add Food</button>}
    {foodForm && <form className="note-form" onSubmit={saveFood}><h2>{editingFood ? 'Edit Food' : 'Add Food'}</h2>
      <label htmlFor="food-photo">Packaging photo</label><input id="food-photo" type="file" accept="image/*" onChange={event => void choosePhoto(event.target.files?.[0])} />
      {food.photo && <><img className="pet-profile-photo" src={food.photo} alt="Food packaging preview" /><button type="button" className="text-action" onClick={() => setFood({ ...food, photo: null })}>Remove photo</button></>}
      {(['brand', 'name', 'flavor'] as const).map(key => <div key={key}><label htmlFor={`food-${key}`}>{key[0].toUpperCase() + key.slice(1)}</label><input id={`food-${key}`} required={key === 'name'} maxLength={150} value={food[key]} onChange={event => setFood({ ...food, [key]: event.target.value })} /></div>)}
      <FoodType value={food.food_type} onChange={value => setFood({ ...food, food_type: value })} />
      <label htmlFor="food-size">Package size (optional)</label><input id="food-size" maxLength={100} value={food.package_size} onChange={event => setFood({ ...food, package_size: event.target.value })} placeholder="e.g. 1.8 kg" />
      <label htmlFor="food-notes">Notes (optional)</label><textarea id="food-notes" rows={3} maxLength={4000} value={food.notes} onChange={event => setFood({ ...food, notes: event.target.value })} />
      <button className="primary" disabled={busy || photoLoading || !food.name.trim()}>Save food</button><button type="button" className="text-action" disabled={busy || photoLoading} onClick={() => setFoodForm(false)}>Close</button>
    </form>}</>}
    {tab === 'dislikes' && <><h2>Dislikes</h2>{!loading && dislikes.length === 0 && <p>No food dislikes saved yet.</p>}
    {dislikes.map(item => <article className="dashboard-card dislike-card" key={item.id}><h3>{item.ingredient}</h3><p>{item.food_type}{item.notes && ` · ${item.notes}`}</p>
      <button className="text-action" disabled={busy} aria-label={`Edit ${item.ingredient}`} onClick={() => { setEditingDislike(item.id); setDislike({ ingredient: item.ingredient, food_type: item.food_type, notes: item.notes }); setDislikeForm(true); }}>Edit</button>
      <button className="text-action" disabled={busy} aria-label={`Remove ${item.ingredient}`} onClick={() => void remove('pet_dislikes', item.id, item.ingredient)}>Remove</button></article>)}
    {!dislikeForm && <button className="primary" disabled={loading} onClick={() => { setEditingDislike(null); setDislike(emptyDislike()); setDislikeForm(true); }}>+ Add Dislike</button>}
    {dislikeForm && <form className="note-form" onSubmit={saveDislike}><h2>{editingDislike ? 'Edit Dislike' : 'Add Dislike'}</h2>
      <label htmlFor="dislike-ingredient">Flavor or ingredient</label><input id="dislike-ingredient" required maxLength={150} value={dislike.ingredient} onChange={event => setDislike({ ...dislike, ingredient: event.target.value })} />
      <FoodType required value={dislike.food_type} onChange={value => setDislike({ ...dislike, food_type: value })} />
      <label htmlFor="dislike-notes">Notes (optional)</label><textarea id="dislike-notes" rows={3} maxLength={4000} value={dislike.notes} onChange={event => setDislike({ ...dislike, notes: event.target.value })} />
      <button className="primary" disabled={busy || !dislike.ingredient.trim()}>Save dislike</button><button type="button" className="text-action" disabled={busy} onClick={() => setDislikeForm(false)}>Close</button>
    </form>}</>}
  </>;
}
