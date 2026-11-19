import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../shared/client';
import { useMobileModal } from '../ui/useMobileModal';
import { prepareMemoryPhoto } from './memoryPhoto';
import './memories.css';

type Memory = { id: string; title: string; event_date: string; story: string; location: string; category: string | null; photos: string[]; cover_index: number; revision: number };
type Draft = { title: string; event_date: string; story: string; location: string; category: string; photos: string[]; cover_index: number };
const empty = (): Draft => ({ title: '', event_date: '', story: '', location: '', category: '', photos: [], cover_index: 0 });
const categories = ['Date Night', 'Birthday', 'Anniversary', 'Travel', 'Everyday Moments', 'Other'];
const dateLabel = (date: string) => { const [year, month, day] = date.split('-').map(Number); return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, day))); };

export default function SharedMemories({ userId, household, onSignIn }: { userId?: string; household: string | null; onSignIn: () => void }) {
  const [memories, setMemories] = useState<Memory[]>([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<Memory | null>(null), [editing, setEditing] = useState<Memory | null>(null), [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Draft>(empty), [error, setError] = useState(''), [preparing, setPreparing] = useState(false);
  const { bounds, keepFocusedVisible } = useMobileModal(adding || !!detail, '.memory-editor');
  useEffect(() => {
    if (!userId || !household) { setMemories([]); setLoading(false); return; }
    let active = true;
    const refresh = async () => {
      const result = await supabase.from('shared_memories').select('*').eq('household_id', household).order('event_date', { ascending: false }).order('created_at', { ascending: false });
      if (!active) return;
      if (result.error) setError('Could not load memories. Please try again.');
      else setMemories(result.data as Memory[]);
      setLoading(false);
    };
    void refresh();
    const channel = supabase.channel(`memories-${household}`).on('postgres_changes', { event: '*', schema: 'public', table: 'shared_memories', filter: `household_id=eq.${household}` }, () => void refresh()).subscribe();
    const focus = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(focus, 15000);
    window.addEventListener('focus', focus); document.addEventListener('visibilitychange', focus);
    return () => { active = false; clearInterval(timer); window.removeEventListener('focus', focus); document.removeEventListener('visibilitychange', focus); void supabase.removeChannel(channel); };
  }, [userId, household]);
  const begin = (memory?: Memory) => { setEditing(memory ?? null); setDraft(memory ? { title: memory.title, event_date: memory.event_date, story: memory.story, location: memory.location, category: memory.category ?? '', photos: [...memory.photos], cover_index: memory.cover_index } : empty()); setError(''); setDetail(null); setAdding(true); };
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length || preparing) return;
    const available = 5 - draft.photos.length;
    if (files.length > available) { setError(`You can add up to 5 photos. You have room for ${available}.`); return; }
    setPreparing(true); setError(''); const prepared: string[] = []; let failure = '';
    for (const file of Array.from(files)) { try { prepared.push(await prepareMemoryPhoto(file)); } catch (err) { failure = err instanceof Error ? err.message : 'Could not open a photo.'; } }
    setDraft(old => ({ ...old, photos: [...old.photos, ...prepared].slice(0, 5) }));
    if (failure) setError(failure); setPreparing(false);
  };
  const movePhoto = (index: number, direction: number) => setDraft(old => {
    const target = index + direction; if (target < 0 || target >= old.photos.length) return old;
    const photos = [...old.photos]; [photos[index], photos[target]] = [photos[target], photos[index]];
    return { ...old, photos, cover_index: old.cover_index === index ? target : old.cover_index === target ? index : old.cover_index };
  });
  const removePhoto = (index: number) => setDraft(old => ({ ...old, photos: old.photos.filter((_, i) => i !== index), cover_index: old.cover_index === index ? 0 : old.cover_index > index ? old.cover_index - 1 : old.cover_index }));
  const save = async () => {
    if (busy || preparing || !household || !draft.title.trim() || !draft.event_date) return;
    setBusy(true); setError('');
    const values = { title: draft.title.trim(), event_date: draft.event_date, story: draft.story, location: draft.location.trim(), category: draft.category || null, photos: draft.photos, cover_index: draft.cover_index };
    try {
      const result = editing ? await supabase.from('shared_memories').update(values).eq('id', editing.id).eq('household_id', household).eq('revision', editing.revision).select().maybeSingle() : await supabase.from('shared_memories').insert({ ...values, household_id: household }).select().single();
      if (result.error) throw result.error;
      if (!result.data) { setError('This memory changed on another device. Your edits are still here; copy them before reopening the latest version.'); return; }
      const saved = result.data as Memory; setMemories(old => [saved, ...old.filter(item => item.id !== saved.id)].sort((a, b) => b.event_date.localeCompare(a.event_date))); setAdding(false);
    } catch { setError('Could not save this memory. Your story and photos are still here.'); }
    finally { setBusy(false); }
  };
  const remove = async (memory: Memory) => {
    if (busy || !household || !window.confirm('Delete this memory and its photos for both of you?')) return;
    setBusy(true); setError('');
    try { const result = await supabase.from('shared_memories').delete().eq('id', memory.id).eq('household_id', household).eq('revision', memory.revision).select('id').maybeSingle(); if (result.error || !result.data) throw result.error ?? new Error('Changed'); setMemories(old => old.filter(item => item.id !== memory.id)); setDetail(null); }
    catch { setError('Could not delete this memory. It may have changed on another device.'); } finally { setBusy(false); }
  };
  return <section className="preview-page memories-page"><p className="eyebrow">OUR LITTLE MOMENTS</p><h1>Shared Memories<span>.</span></h1>
    {!userId || !household ? <div className="dashboard-card"><p>Sign in to see your shared memories.</p><button className="primary" onClick={onSignIn}>Sign in</button></div> : <>
      <div className="memories-toolbar"><p>Moments worth keeping, together.</p><button className="primary" onClick={() => begin()}>+ Add memory</button></div>
      {error && !adding && <p role="alert" className="feedback error-message">{error}</p>}
      {loading ? <p role="status">Loading memories…</p> : memories.length === 0 ? <div className="memory-empty"><span aria-hidden="true">♡</span><h2>Your story starts here.</h2><p>Save a moment you would love to revisit together.</p></div> : <div className="memory-grid">{memories.map(memory => <button className="memory-card" key={memory.id} onClick={() => setDetail(memory)}><span className="memory-cover">{memory.photos[memory.cover_index] ? <img src={memory.photos[memory.cover_index]} alt="" /> : <span aria-hidden="true">♡</span>}</span><span className="memory-card-copy"><strong>{memory.title}</strong><small>{dateLabel(memory.event_date)}{memory.category ? ` · ${memory.category}` : ''}</small></span></button>)}</div>}
      {detail && createPortal(<div className="memory-overlay" style={bounds ?? undefined}><section className="memory-detail" role="dialog" aria-modal="true" aria-label="Memory details"><div className="memory-heading"><h2>{detail.title}</h2><button onClick={() => setDetail(null)}>Close</button></div><p>{dateLabel(detail.event_date)}{detail.category ? ` · ${detail.category}` : ''}</p>{detail.location && <p>{detail.location}</p>}{detail.photos.length > 0 && <div className="memory-gallery">{detail.photos.map((photo, index) => <img key={index} src={photo} alt={`Memory photo ${index + 1}`} />)}</div>}{detail.story && <><h3>Our story</h3><p className="memory-story">{detail.story}</p></>}<div className="memory-actions"><button onClick={() => begin(detail)}>Edit memory</button><button disabled={busy} onClick={() => void remove(detail)}>Delete memory</button></div>{error && <p role="alert">{error}</p>}</section></div>, document.body)}
      {adding && <div className="memory-overlay" style={bounds ?? undefined}><form className="memory-editor" role="dialog" aria-modal="true" aria-label={editing ? 'Edit memory' : 'New memory'} onFocusCapture={keepFocusedVisible} onSubmit={event => { event.preventDefault(); void save(); }}><div className="memory-heading"><h2>{editing ? 'Edit memory' : 'New memory'}</h2><button type="button" onClick={() => setAdding(false)} disabled={busy || preparing}>Cancel</button></div><label>Title<input required maxLength={150} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label>Event date<input type="date" required value={draft.event_date} onChange={event => setDraft({ ...draft, event_date: event.target.value })} /></label><label>Photos ({draft.photos.length}/5)<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={preparing || draft.photos.length >= 5} onChange={event => { void addPhotos(event.target.files); event.currentTarget.value = ''; }} /></label>{preparing && <p role="status">Preparing photos…</p>}{draft.photos.length > 0 && <div className="memory-photo-list">{draft.photos.map((photo, index) => <div className="memory-photo-edit" key={index}><img src={photo} alt={`Selected photo ${index + 1}`} /><div><button type="button" aria-pressed={draft.cover_index === index} onClick={() => setDraft({ ...draft, cover_index: index })}>{draft.cover_index === index ? 'Cover photo' : 'Set as cover'}</button><button type="button" aria-label={`Move photo ${index + 1} earlier`} disabled={index === 0} onClick={() => movePhoto(index, -1)}>↑</button><button type="button" aria-label={`Move photo ${index + 1} later`} disabled={index === draft.photos.length - 1} onClick={() => movePhoto(index, 1)}>↓</button><button type="button" aria-label={`Remove photo ${index + 1}`} onClick={() => removePhoto(index)}>×</button></div></div>)}</div>}<label>Our story (optional)<textarea rows={4} maxLength={20000} value={draft.story} onChange={event => setDraft({ ...draft, story: event.target.value })} /></label><label>Location (optional)<input maxLength={200} value={draft.location} onChange={event => setDraft({ ...draft, location: event.target.value })} /></label><label>Category (optional)<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value })}><option value="">None</option>{categories.map(category => <option key={category}>{category}</option>)}</select></label>{error && <p role="alert">{error}</p>}<button className="primary" disabled={busy || preparing || !draft.title.trim() || !draft.event_date}>{busy ? 'Saving…' : 'Save memory'}</button></form></div>}
    </>}</section>;
}
