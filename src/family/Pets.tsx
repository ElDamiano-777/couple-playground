import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../shared/client';
import { calculateAge, formatAge } from './age';
import { useAgeDate } from './useAgeDate';
import { formatBirthday } from './birthdays';
import PetTypeSelect from './PetTypeSelect';
import type { FamilyProfile, FamilyProfilesState } from './useFamilyProfiles';
import './pets.css';
import { readPhoto } from './petPhoto';
import PetCollections from './PetCollections';

type FoodPreview = { id: string; name: string; brand: string; package_size: string; photo: string | null };
type Detail = { pet_id: string; photo: string | null; likes: string; dislikes: string; important_notes: string };
const emptyDetail = (pet_id: string): Detail => ({ pet_id, photo: null, likes: '', dislikes: '', important_notes: '' });


export default function Pets({ state, onSignIn }: { state: FamilyProfilesState; onSignIn: () => void }) {
  const [details, setDetails] = useState<Detail[]>([]);
  const [foodPreview, setFoodPreview] = useState<FoodPreview[]>([]);
  const [previewStatus, setPreviewStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'profile' | 'food' | 'dislikes' | 'add'>('list');
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailsReady, setDetailsReady] = useState(false);
  const [reload, setReload] = useState(0);
  const today = useAgeDate();
  const pets = state.profiles.filter(p => p.kind === 'pet');
  const pet = pets.find(p => p.id === selected);
  useEffect(() => {
    let active = true;
    setDetails([]); setDetailsReady(false); setSelected(null); setView('list');
    if (!state.userId || !state.household) return;
    const load = async () => {
      setLoading(true);
      const d = await supabase.from('pet_details').select('*');
      if (!active) return;
      if (d.error) setError('Could not load pet details. Please try again.');
      else { setDetails(d.data as Detail[]); setDetailsReady(true); setError(''); }
      setLoading(false);
    };
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [state.userId, state.household, reload]);
  useEffect(() => {
    if (view !== 'profile' || !selected) return;
    let active = true;
    const load = async () => {
      setPreviewStatus('loading');
      const result = await supabase.from('pet_food').select('id,name,brand,package_size,photo').eq('pet_id', selected).order('created_at').limit(3);
      if (!active) return;
      if (result.error) { setFoodPreview([]); setPreviewStatus('error'); }
      else { setFoodPreview(result.data as FoodPreview[]); setPreviewStatus('ready'); }
    };
    setFoodPreview([]);
    void load();
    const refresh = () => { if (!document.hidden) void load(); };
    window.addEventListener('focus', refresh);
    return () => { active = false; window.removeEventListener('focus', refresh); };
  }, [selected, view]);
  function open(p: FamilyProfile, next: 'profile' | 'food' | 'dislikes') {
    if (next === 'profile') { setFoodPreview([]); setPreviewStatus('loading'); }
    setSelected(p.id); setDetail(details.find(d => d.pet_id === p.id) ?? emptyDetail(p.id));
    setView(next); setError('');
  }
  async function photo(file: File | undefined) {
    if (!file) return;
    try {
      const value = await readPhoto(file);
      if (value.length > 1400000) throw new Error('Photo is too large.');
      setDetail(d => d && ({ ...d, photo: value }));
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
  if (!state.authReady || state.contextLoading) return <section className="preview-page"><p>Opening your pets…</p></section>;
  if (!state.userId || !state.household) return <section className="preview-page"><h1>Pets<span>.</span></h1><section className="dashboard-card"><p>Sign in to see your shared pets.</p><button className="primary" onClick={onSignIn}>Sign in through Shopping</button></section></section>;
  return <section className="preview-page pets-page"><h1>{view === 'list' || view === 'add' ? 'Pets' : pet?.name}<span>.</span></h1>
    {state.isPoc && <p className="notice">POC test space. Don’t add sensitive personal information or private photos.</p>}
    {(error || state.error) && <p role="alert" className="feedback error-message">{error || state.error}</p>}
    {loading && <p role="status">Loading pets…</p>}
    {!loading && !detailsReady && <button className="text-action" onClick={() => setReload(value => value + 1)}>Retry loading pets</button>}
    {view === 'list' && <><div className="pet-grid">{pets.map(p => <article className="pet-card" key={p.id}>
      <button className="pet-open" disabled={loading || !detailsReady} onClick={() => open(p, 'profile')} aria-label={`Open ${p.name}'s profile`}>{details.find(d => d.pet_id === p.id)?.photo ? <img src={details.find(d => d.pet_id === p.id)!.photo!} alt="" /> : <span className="pet-placeholder" aria-hidden="true">🐾</span>}<strong>{p.name}</strong></button>
      <button className="pet-food-button" disabled={loading || !detailsReady} onClick={() => open(p, 'food')}>My Food</button>
    </article>)}</div>{pets.length === 0 && !state.loading && <p>No pets yet. Add your first pet.</p>}<button className="primary" onClick={() => { state.setKind('pet'); state.clearNotice(); setView('add'); }}>+ Add Pet</button></>}
    {view === 'add' && <form className="note-form" onSubmit={async e => { e.preventDefault(); await state.add(); }}><button type="button" className="text-action" onClick={() => setView('list')}>← Pets</button><h2>Add Pet</h2><label htmlFor="pet-name">Name</label><input id="pet-name" required maxLength={100} value={state.drafts.pet.name} onChange={e => state.setDraft('name', e.target.value)} /><PetTypeSelect id="pet-type" value={state.drafts.pet.animalType} disabled={state.busy} onChange={v => state.setDraft('animalType', v)} /><label htmlFor="pet-birthday">Birthday (optional)</label><input id="pet-birthday" type="date" max={today} value={state.drafts.pet.birthDate} onChange={e => state.setDraft('birthDate', e.target.value)} /><button className="primary" disabled={state.busy || !state.drafts.pet.name.trim()}>Add pet</button>{state.notice && <p role="status">{state.notice} <button type="button" className="text-action" onClick={() => setView('list')}>View pets</button></p>}</form>}
    {view === 'profile' && pet && detail && <>
      <button className="text-action" onClick={() => setView('list')}>← Pets</button>
      <div className="pet-profile-summary">
        {detail.photo ? <img className="pet-profile-photo" src={detail.photo} alt={pet.name} /> : <div className="pet-profile-placeholder" aria-hidden="true">🐾</div>}
        <p>{pet.animal_type || 'Pet'}{pet.birth_date && ` · Birthday: ${formatBirthday(pet.birth_date)} · ${formatAge(calculateAge(pet.birth_date, today)!)}`}</p>
      </div>
      <button className="pet-feature-card pet-feature-food" onClick={() => open(pet, 'food')}>
        <span className="pet-feature-header"><span><strong>My Food</strong><small>Favorite food, all in one place</small></span><span aria-hidden="true">↗</span></span>
        {previewStatus === 'loading' ? <span className="pet-feature-message">Loading food…</span> : previewStatus === 'error' ? <span className="pet-feature-message">Open your food collection</span> : foodPreview.length === 0 ? <span className="pet-feature-message">Add their first food</span> : <span className="pet-food-previews">{foodPreview.map(item => <span className="pet-food-preview" key={item.id}><span className="pet-food-thumb">{item.photo ? <img src={item.photo} alt="" /> : <span className="pet-food-placeholder" aria-hidden="true">✦</span>}</span><span className="pet-food-copy">{item.brand && <span className="pet-food-brand">{item.brand}</span>}<strong>{item.name}</strong>{item.package_size && <span className="pet-food-size">{item.package_size}</span>}</span></span>)}</span>}
      </button>
      <button className="pet-feature-card pet-feature-dislikes" onClick={() => open(pet, 'dislikes')}>
        <span className="pet-feature-header"><span><strong>Food Preferences</strong><small>Likes, dislikes and food notes</small></span><span aria-hidden="true">↗</span></span>
      </button>
      <button className="text-action" onClick={() => { state.startEdit(pet); }}>Edit name, type or birthday</button>
      {state.edit?.id === pet.id && <form className="note-form" onSubmit={e => { e.preventDefault(); void state.saveEdit(); }}><label htmlFor="edit-pet-name">Name</label><input id="edit-pet-name" required maxLength={100} value={state.edit.name} onChange={e => state.setEditField('name', e.target.value)} /><PetTypeSelect id="edit-pet-type" value={state.edit.animalType} disabled={state.busy} onChange={v => state.setEditField('animalType', v)} /><label htmlFor="edit-pet-birthday">Birthday</label><input id="edit-pet-birthday" type="date" max={today} value={state.edit.birthDate} onChange={e => state.setEditField('birthDate', e.target.value)} /><button className="primary" disabled={state.busy}>Save profile</button><button type="button" onClick={state.cancelEdit}>Cancel</button></form>}
      <details className="pet-extra"><summary>Photo and saved notes</summary><form className="note-form" onSubmit={saveDetail}><label htmlFor="pet-photo">Photo</label><input id="pet-photo" type="file" accept="image/*" onChange={e => void photo(e.target.files?.[0])} />{detail.photo && <button type="button" className="text-action" onClick={() => setDetail({ ...detail, photo: null })}>Remove photo</button>}{(['likes', 'dislikes', 'important_notes'] as const).map(key => <div key={key}><label htmlFor={key}>{key === 'important_notes' ? 'Important Notes' : key === 'likes' ? 'Likes' : 'Dislikes'}</label><textarea id={key} rows={3} maxLength={4000} value={detail[key]} onChange={e => setDetail({ ...detail, [key]: e.target.value })} /></div>)}<button className="primary" disabled={busy}>Save changes</button></form></details>
      <button className="text-action pet-remove" onClick={() => { if (window.confirm(`Remove ${pet.name} and their food for both of you?`)) { void state.remove(pet); setView('list'); } }}>Remove pet</button>
    </>}
    {(view === 'food' || view === 'dislikes') && pet && <PetCollections key={pet.id} petId={pet.id} initialTab={view} onBack={() => setView('list')} />}
  </section>;
}
