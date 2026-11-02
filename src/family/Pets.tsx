import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../shared/client';
import { calculateAge, formatAge } from './age';
import { useAgeDate } from './useAgeDate';
import { formatBirthday } from './birthdays';
import PetTypeSelect from './PetTypeSelect';
import type { FamilyProfile, FamilyProfilesState } from './useFamilyProfiles';
import './pets.css';

type Detail = { pet_id: string; photo: string | null; likes: string; dislikes: string; important_notes: string };
type Food = { id: string; pet_id: string; photo: string | null; brand: string; name: string; flavor: string; food_type: string };
const emptyDetail = (pet_id: string): Detail => ({ pet_id, photo: null, likes: '', dislikes: '', important_notes: '' });
const emptyFood = () => ({ photo: null as string | null, brand: '', name: '', flavor: '', food_type: '' });

async function readPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choose an image.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not open photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  } finally { bitmap.close(); }
}

export default function Pets({ state, onSignIn }: { state: FamilyProfilesState; onSignIn: () => void }) {
  const [details, setDetails] = useState<Detail[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'profile' | 'food' | 'add'>('list');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [food, setFood] = useState(emptyFood);
  const [addingFood, setAddingFood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const today = useAgeDate();
  const pets = state.profiles.filter(p => p.kind === 'pet');
  const pet = pets.find(p => p.id === selected);
  useEffect(() => {
    let active = true;
    setDetails([]); setFoods([]); setSelected(null); setView('list');
    if (!state.userId || !state.household) return;
    const load = async () => {
      setLoading(true);
      const [d, f] = await Promise.all([supabase.from('pet_details').select('*'), supabase.from('pet_food').select('*').order('created_at')]);
      if (!active) return;
      if (d.error || f.error) setError('Could not load pet details. Please try again.');
      else { setDetails(d.data as Detail[]); setFoods(f.data as Food[]); setError(''); }
      setLoading(false);
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [state.userId, state.household]);
  function open(p: FamilyProfile, next: 'profile' | 'food') {
    setSelected(p.id); setDetail(details.find(d => d.pet_id === p.id) ?? emptyDetail(p.id));
    setView(next); setError(''); setAddingFood(false);
  }
  async function photo(file: File | undefined, target: 'pet' | 'food') {
    if (!file) return;
    try {
      const value = await readPhoto(file);
      if (value.length > 1400000) throw new Error('Photo is too large.');
      if (target === 'pet') setDetail(d => d && ({ ...d, photo: value }));
      else setFood(f => ({ ...f, photo: value }));
    } catch { setError('Could not open this photo. Please choose another image.'); }
  }
  async function saveDetail(event: FormEvent) {
    event.preventDefault(); if (!detail) return;
    setBusy(true); setError('');
    const result = await supabase.from('pet_details').upsert(detail).select().single();
    if (result.error) setError('Could not save. Your changes are still here.');
    else { setDetails(rows => [...rows.filter(d => d.pet_id !== detail.pet_id), result.data as Detail]); setView('list'); }
    setBusy(false);
  }
  async function saveFood(event: FormEvent) {
    event.preventDefault(); if (!pet) return;
    setBusy(true); setError('');
    const result = await supabase.from('pet_food').insert({ ...food, pet_id: pet.id }).select().single();
    if (result.error) setError('Could not save food. Your changes are still here.');
    else { setFoods(rows => [...rows, result.data as Food]); setFood(emptyFood()); setAddingFood(false); }
    setBusy(false);
  }
  if (!state.authReady || state.contextLoading) return <section className="preview-page"><p>Opening your pets…</p></section>;
  if (!state.userId || !state.household) return <section className="preview-page"><h1>Pets<span>.</span></h1><section className="dashboard-card"><p>Sign in to see your shared pets.</p><button className="primary" onClick={onSignIn}>Sign in through Shopping</button></section></section>;
  return <section className="preview-page pets-page"><h1>{view === 'list' || view === 'add' ? 'Pets' : pet?.name}<span>.</span></h1>
    {state.isPoc && <p className="notice">POC test space. Don’t add sensitive personal information or private photos.</p>}
    {(error || state.error) && <p role="alert" className="feedback error-message">{error || state.error}</p>}
    {loading && <p role="status">Loading pets…</p>}
    {view === 'list' && <><div className="pet-grid">{pets.map(p => <article className="pet-card" key={p.id}>
      <button className="pet-open" disabled={loading} onClick={() => open(p, 'profile')} aria-label={`Open ${p.name}'s profile`}>{details.find(d => d.pet_id === p.id)?.photo ? <img src={details.find(d => d.pet_id === p.id)!.photo!} alt="" /> : <span className="pet-placeholder" aria-hidden="true">🐾</span>}<strong>{p.name}</strong></button>
      <button className="pet-food-button" disabled={loading} onClick={() => open(p, 'food')}>My Food</button>
    </article>)}</div>{pets.length === 0 && !state.loading && <p>No pets yet. Add your first pet.</p>}<button className="primary" onClick={() => { state.setKind('pet'); setView('add'); }}>+ Add Pet</button></>}
    {view === 'add' && <form className="note-form" onSubmit={async e => { e.preventDefault(); await state.add(); }}><button type="button" className="text-action" onClick={() => setView('list')}>← Pets</button><h2>Add Pet</h2><label htmlFor="pet-name">Name</label><input id="pet-name" required maxLength={100} value={state.drafts.pet.name} onChange={e => state.setDraft('name', e.target.value)} /><PetTypeSelect id="pet-type" value={state.drafts.pet.animalType} disabled={state.busy} onChange={v => state.setDraft('animalType', v)} /><label htmlFor="pet-birthday">Birthday (optional)</label><input id="pet-birthday" type="date" max={today} value={state.drafts.pet.birthDate} onChange={e => state.setDraft('birthDate', e.target.value)} /><button className="primary" disabled={state.busy || !state.drafts.pet.name.trim()}>Add pet</button>{state.notice && <p role="status">{state.notice} <button type="button" className="text-action" onClick={() => setView('list')}>View pets</button></p>}</form>}
    {view === 'profile' && pet && detail && <><button className="text-action" onClick={() => setView('list')}>← Pets</button><form className="note-form" onSubmit={saveDetail}><h2>Profile</h2><p>{pet.animal_type || 'Pet'}{pet.birth_date && ` · Birthday: ${formatBirthday(pet.birth_date)} · ${formatAge(calculateAge(pet.birth_date, today)!)}`}</p>{detail.photo && <img className="pet-profile-photo" src={detail.photo} alt={`${pet.name}`} />}<label htmlFor="pet-photo">Photo</label><input id="pet-photo" type="file" accept="image/*" onChange={e => void photo(e.target.files?.[0], 'pet')} />{detail.photo && <button type="button" className="text-action" onClick={() => setDetail({ ...detail, photo: null })}>Remove photo</button>}{(['likes', 'dislikes', 'important_notes'] as const).map(key => <div key={key}><label htmlFor={key}>{key === 'important_notes' ? 'Important Notes' : key === 'likes' ? 'Likes' : 'Dislikes'}</label><textarea id={key} rows={3} maxLength={4000} value={detail[key]} onChange={e => setDetail({ ...detail, [key]: e.target.value })} /></div>)}<button className="primary" disabled={busy}>Save details</button></form><button className="text-action" onClick={() => { state.startEdit(pet); }}>Edit name, type or birthday</button>{state.edit?.id === pet.id && <form className="note-form" onSubmit={e => { e.preventDefault(); void state.saveEdit(); }}><label htmlFor="edit-pet-name">Name</label><input id="edit-pet-name" required maxLength={100} value={state.edit.name} onChange={e => state.setEditField('name', e.target.value)} /><PetTypeSelect id="edit-pet-type" value={state.edit.animalType} disabled={state.busy} onChange={v => state.setEditField('animalType', v)} /><label htmlFor="edit-pet-birthday">Birthday</label><input id="edit-pet-birthday" type="date" max={today} value={state.edit.birthDate} onChange={e => state.setEditField('birthDate', e.target.value)} /><button className="primary" disabled={state.busy}>Save profile</button><button type="button" onClick={state.cancelEdit}>Cancel</button></form>}<button className="text-action" onClick={() => open(pet, 'food')}>My Food →</button><button className="text-action" onClick={() => { if (window.confirm(`Remove ${pet.name} and their food for both of you?`)) { void state.remove(pet); setView('list'); } }}>Remove pet</button></>}
    {view === 'food' && pet && <><button className="text-action" onClick={() => setView('list')}>← Pets</button><h2>My Food</h2><div className="pet-grid">{foods.filter(f => f.pet_id === pet.id).map(f => <article className="pet-card food-card" key={f.id}>{f.photo && <img src={f.photo} alt="" />}<strong>{f.name}</strong><p>{[f.brand, f.flavor, f.food_type].filter(Boolean).join(' · ')}</p><button className="text-action" onClick={async () => { if (!window.confirm(`Remove ${f.name} for both of you?`)) return; const result = await supabase.from('pet_food').delete().eq('id', f.id); if (result.error) setError('Could not remove food.'); else setFoods(rows => rows.filter(row => row.id !== f.id)); }}>Remove</button></article>)}</div><button className="primary" onClick={() => setAddingFood(true)}>+ Add Food</button>{addingFood && <form className="note-form" onSubmit={saveFood}><h2>Add Food</h2><label htmlFor="food-photo">Packaging photo</label><input id="food-photo" type="file" accept="image/*" onChange={e => void photo(e.target.files?.[0], 'food')} />{food.photo && <img className="pet-profile-photo" src={food.photo} alt="Food packaging preview" />}{(['brand', 'name', 'flavor', 'food_type'] as const).map(key => <div key={key}><label htmlFor={`food-${key}`}>{key === 'food_type' ? 'Food type' : key[0].toUpperCase() + key.slice(1)}</label><input id={`food-${key}`} required={key === 'name'} maxLength={150} value={food[key]} onChange={e => setFood({ ...food, [key]: e.target.value })} /></div>)}<button className="primary" disabled={busy}>Save food</button><button type="button" className="text-action" onClick={() => setAddingFood(false)}>Close</button></form>}</>}
  </section>;
}
