import { useEffect, useState } from 'react';
import { supabase } from '../shared/client';
import type { Note, PartnerNotesState } from './usePartnerNotes';
import '../expenses/expenses.css';
import './partner-notes.css';
import OurNotes from './OurNotes';
import { localScheduleValue, scheduledInstant, scheduleLabel } from './schedule';
import { getNotePhotos, prepareNotePhoto } from './notePhotos';
import NotePhotos from './NotePhotos';
import { useNoteInteractions } from './useNoteInteractions';

export default function PartnerNotes({ userId, household, viewer, state, onBack, onDirty }: { userId?: string; household: string | null; viewer: 'masha' | 'damian'; state: PartnerNotesState; onBack: () => void; onDirty: (dirty: boolean) => void }) {
  const [sharedDirty, setSharedDirty] = useState(false);
  const [tab, setTab] = useState<'personal' | 'shared'>('personal');
  const [letterFilter, setLetterFilter] = useState<'all' | 'favorites'>('all');
  const interactions = useNoteInteractions(userId, household, tab === 'personal');
  const [composing, setComposing] = useState(false);
  const [message, setMessage] = useState('');
  const [draft, setDraft] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [originalPhotos, setOriginalPhotos] = useState<string[]>([]);
  const [photoProgress, setPhotoProgress] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [delivery, setDelivery] = useState<'now' | 'scheduled'>('now');
  const [scheduledTime, setScheduledTime] = useState('');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 15000); return () => window.clearInterval(timer); }, []);
  const chosenTime = scheduledInstant(scheduledTime);
  const scheduleValid = !!chosenTime && chosenTime.getTime() > now;
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [edit, setEdit] = useState<Note | null>(null);
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const { notes, reads, statuses, refresh, error, setError, setNotes, markRead, unread } = state;
  const personalDirty = composing && (!!photoProgress || (edit ? draft !== edit.body || (delivery === 'scheduled' && scheduledTime !== localScheduleValue(edit.deliver_at!)) || JSON.stringify(photos) !== JSON.stringify(originalPhotos) : !!draft.trim() || !!scheduledTime || photos.length > 0));
  useEffect(() => { onDirty(personalDirty || sharedDirty); return () => onDirty(false); }, [personalDirty, sharedDirty, onDirty]);
  const choosePhotos = async (files: File[]) => {
    if (!files.length || photoProgress) return;
    if (files.length + photos.length > 5) { setPhotoError('You can add up to 5 photos.'); return; }
    setPhotoError('');
    const prepared: string[] = [];
    try {
      for (let index = 0; index < files.length; index++) {
        setPhotoProgress(`Preparing photo ${index + 1} of ${files.length}…`);
        prepared.push(await prepareNotePhoto(files[index]));
      }
      setPhotos(current => [...current, ...prepared]);
    } catch (error) { setPhotoError(error instanceof Error ? error.message : 'Could not prepare the photo.'); }
    finally { setPhotoProgress(''); }
  };
  const save = async () => {
    const scheduled = delivery === 'scheduled';
    const instant = scheduled ? scheduledInstant(scheduledTime) : null;
    if (!household || (!draft.trim() && !photos.length) || saving || photoProgress || (scheduled && (!instant || instant.getTime() <= Date.now()))) return;
    setSaving(true); setPhotoError('');
    const result = await supabase.rpc('save_partner_note_photos', {
      p_note_id: edit?.id ?? null, p_expected_delivery: edit?.deliver_at ?? null, p_expected_updated_at: edit?.updated_at ?? null, p_sender: viewer,
      p_body: draft.trim(), p_delivery: scheduled && instant ? instant.toISOString() : null, p_photos: photos,
    }).single();
    if (result.error || !result.data) setError('Could not save your note or photos. Please check your connection and try again.');
    else { setNotes(current => [result.data as Note, ...current.filter(note => note.id !== (result.data as Note).id)]); setDraft(''); setPhotos([]); setOriginalPhotos([]); setScheduledTime(''); setDelivery('now'); setEdit(null); setComposing(false); setMessage(scheduled ? 'Surprise scheduled.' : edit ? 'Note saved.' : 'Note sent.'); setError(''); void refresh(); }
    setSaving(false);
  };
  const remove = async (note: Note) => {
    if (!confirm('Delete this note?')) return;
    const result = await supabase.from('partner_notes').delete().eq('id', note.id);
    if (result.error) setError('Could not delete note.');
    else setNotes(current => current.filter(item => item.id !== note.id));
  };
  const cancelSurprise = async (note: Note) => {
    if (!confirm('Cancel this scheduled surprise?')) return;
    const result = await supabase.from('partner_notes').delete().eq('id', note.id).eq('deliver_at', note.deliver_at!).select('id').maybeSingle();
    if (result.error || !result.data) setError('Could not cancel this surprise. It may already have been delivered.');
    else { setNotes(current => current.filter(item => item.id !== note.id)); setMessage('Surprise cancelled.'); }
  };
  const scheduledNotes = notes.filter(note => note.created_by === userId && note.deliver_at && (statuses[note.id] === 'scheduled' || (!statuses[note.id] && new Date(note.deliver_at).getTime() > now)));
  const deliveredNotes = notes.filter(note => !scheduledNotes.some(item => item.id === note.id) && (letterFilter === 'all' || interactions.favorites.includes(note.id)));
  const editNote = async (note: Note) => {
    if (personalDirty && !confirm('Discard your unfinished note?')) return;
    setSaving(true);
    try {
      const existing = note.photo_count ? await getNotePhotos(note.id) : [];
      if (existing.length !== (note.photo_count || 0)) throw new Error('Missing photos');
      setEdit(note); setDraft(note.body); setPhotos(existing); setOriginalPhotos(existing); setPhotoError('');
      setDelivery(note.deliver_at ? 'scheduled' : 'now'); setScheduledTime(note.deliver_at ? localScheduleValue(note.deliver_at) : ''); setMessage(''); setComposing(true);
    } catch { setError('Could not load the note’s photos. Please try again.'); }
    finally { setSaving(false); }
  };
  return <section className="partner-notes">
    <button className="text-action" onClick={onBack}>← Us</button>
    <p className="eyebrow">FOR EACH OTHER</p><h1>Love Notes<span>.</span></h1>
    <div className="love-note-tabs" role="tablist" aria-label="Love Notes sections"><button role="tab" aria-selected={tab === 'personal'} onClick={() => setTab('personal')}>For Each Other 💌</button><button role="tab" aria-selected={tab === 'shared'} onClick={() => setTab('shared')}>Our Notes 📖</button></div>
    <div hidden={tab !== 'personal'}>
    <p className="notes-lead">{unread ? `${unread} unread note${unread === 1 ? '' : 's'}.` : 'A little note for your partner.'}</p>
    {!composing && <button className="notes-create" disabled={!household} onClick={() => { setMessage(''); setEdit(null); setPhotos([]); setOriginalPhotos([]); setPhotoError(''); setDelivery('now'); setScheduledTime(''); setComposing(true); }}>+ Write a note</button>}
    {composing && <form className="note-composer" onSubmit={event => { event.preventDefault(); void save(); }}>
      {(!edit || edit.deliver_at) && <fieldset className="delivery-options"><legend>Delivery</legend><label><input type="radio" name="delivery" checked={delivery === 'now'} disabled={!!edit} onChange={() => setDelivery('now')} /> Send now</label><label><input type="radio" name="delivery" checked={delivery === 'scheduled'} onChange={() => setDelivery('scheduled')} /> Schedule a surprise 💌</label></fieldset>}
      {delivery === 'scheduled' && <div className="schedule-picker"><label htmlFor="surprise-time">Delivery date and time</label><input id="surprise-time" type="datetime-local" required min={localScheduleValue(new Date(now).toISOString())} value={scheduledTime} onChange={event => setScheduledTime(event.target.value)} /><small>Times use your phone’s time zone ({zone}).</small>{scheduledTime && <small>{chosenTime ? `Delivery: ${scheduleLabel(chosenTime.toISOString())}` : 'Choose a valid local time.'}</small>}{scheduledTime && !scheduleValid && <small>Choose a valid time in the future.</small>}</div>}
      <textarea aria-label="Partner note" maxLength={2000} value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write something kind or useful…" />
      <div className="note-photo-picker"><label className="note-photo-button">📷 Add photos<input type="file" aria-label="Add photos" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" multiple disabled={saving || !!photoProgress || photos.length >= 5} onChange={event => { void choosePhotos(Array.from(event.target.files ?? [])); event.target.value = ''; }} /></label><label className="note-photo-button">Take photo<input type="file" aria-label="Take photo" accept="image/*" capture="environment" disabled={saving || !!photoProgress || photos.length >= 5} onChange={event => { void choosePhotos(Array.from(event.target.files ?? [])); event.target.value = ''; }} /></label><small>{photos.length}/5 photos</small></div>
      {!!photos.length && <div className="note-photo-previews">{photos.map((photo, index) => <div key={index}><img src={photo} alt={`Photo ${index + 1} preview`} /><button type="button" disabled={saving} onClick={() => setPhotos(current => current.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`}>Remove</button></div>)}</div>}
      {photoProgress && <p role="status">{photoProgress}</p>}{saving && <p role="status">{photos.length ? 'Uploading photos and saving note…' : 'Saving note…'}</p>}{photoError && <p role="alert">{photoError}</p>}
      <div className="note-form-actions"><button className="primary" disabled={!household || (!draft.trim() && !photos.length) || saving || !!photoProgress || (delivery === 'scheduled' && !scheduleValid)}>{edit ? 'Save note' : delivery === 'scheduled' ? 'Schedule' : 'Send'}</button>
      <button type="button" disabled={saving || !!photoProgress} onClick={() => { if (personalDirty && !confirm('Discard your changes?')) return; setEdit(null); setDraft(''); setPhotos([]); setOriginalPhotos([]); setPhotoError(''); setScheduledTime(''); setDelivery('now'); setComposing(false); }}>Cancel</button></div>
    </form>}
    {message && <p role="status" className="note-status">{message}</p>}
    {error && <p role="alert">{error}</p>}
    <div className="letter-filter" role="group" aria-label="Filter letters"><button aria-pressed={letterFilter === 'all'} onClick={() => setLetterFilter('all')}>All</button><button aria-pressed={letterFilter === 'favorites'} onClick={() => setLetterFilter('favorites')}>Favorites</button></div>
    {interactions.error && <p role="alert">{interactions.error}</p>}
    {letterFilter === 'favorites' && !deliveredNotes.length && <p className="notes-lead">Your favorite letters will appear here.</p>}
    {letterFilter === 'all' && !!scheduledNotes.length && <details className="scheduled-notes"><summary><span>Scheduled ({scheduledNotes.length})</span></summary><div className="partner-note-list">{[...scheduledNotes].sort((a, b) => a.deliver_at!.localeCompare(b.deliver_at!)).map(note => <article className="scheduled-surprise" key={note.id}><strong><svg aria-hidden="true" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> Scheduled surprise</strong><span className="note-direction">Sent · {note.sender === 'masha' ? 'Masha' : 'Damian'}</span><span className="surprise-status">{statuses[note.id] === 'scheduled' ? 'Scheduled' : 'Status unavailable'}</span><time dateTime={note.deliver_at!}>{scheduleLabel(note.deliver_at!)}</time>{!!note.body && <p>{note.body}</p>}{!!note.photo_count && <NotePhotos noteId={note.id} count={note.photo_count} version={note.updated_at} />}<div className="surprise-actions"><button disabled={saving} onClick={() => void editNote(note)}>Edit</button><button onClick={() => void cancelSurprise(note)}>Cancel surprise</button></div></article>)}</div></details>}
    <div className="partner-note-list">{[...deliveredNotes].sort((a, b) => (b.deliver_at ?? b.created_at).localeCompare(a.deliver_at ?? a.created_at)).map(note => {
      const closed = note.created_by !== userId && !reads.includes(note.id);
      return <article className={closed ? 'unread note-envelope' : 'note-open'} key={note.id}>
        <span className="envelope-icon" aria-hidden="true">{closed ? '✉' : ''}</span><div className="letter-heading"><strong>{note.sender === 'masha' ? 'Masha' : 'Damian'}{closed && <em>New</em>}</strong><button className="letter-bookmark" aria-label={interactions.favorites.includes(note.id) ? 'Remove from favorites' : 'Add to favorites'} aria-pressed={interactions.favorites.includes(note.id)} disabled={!interactions.ready || !!interactions.busy} onClick={() => void interactions.toggleFavorite(note.id)}><svg aria-hidden="true" viewBox="0 0 24 24" width="21" height="21" fill={interactions.favorites.includes(note.id) ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M6 3h12v18l-6-4-6 4z"/></svg></button></div><span className="note-direction">{note.created_by === userId ? 'Sent' : 'Received'}</span>
        {note.created_by === userId && note.deliver_at && <span className="surprise-status">{statuses[note.id] === 'delivered' ? 'Delivered · opened in Together' : statuses[note.id] === 'scheduled' ? 'Scheduled' : statuses[note.id] === 'unconfirmed' ? 'Release unconfirmed' : 'Status unavailable'}</span>}
        <time dateTime={note.deliver_at ?? note.created_at}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(note.deliver_at ?? note.created_at))}</time>
        {closed ? <button className="open-note" disabled={opening === note.id} onClick={() => { setOpening(note.id); void markRead(note).then(() => interactions.refresh()).finally(() => setOpening(null)); }}>Open note <span aria-hidden="true">✉</span></button> : <div className="note-message">{!!note.body && <p>{note.body}</p>}{!!note.photo_count && <NotePhotos noteId={note.id} count={note.photo_count} version={note.updated_at} />}<div className="letter-reactions" role="group" aria-label="Reactions">{([{ emoji: '❤️', name: 'Heart' }, { emoji: '🥰', name: 'Love' }, { emoji: '😂', name: 'Laugh' }] as const).map(item => <button key={item.name} aria-label={`React with ${item.name}`} aria-pressed={interactions.reactions.some(reaction => reaction.note_id === note.id && reaction.user_id === userId && reaction.reaction === item.emoji)} disabled={!interactions.ready || !!interactions.busy} onClick={() => void interactions.toggleReaction(note.id, item.emoji)}>{item.emoji}</button>)}</div>{interactions.reactions.some(reaction => reaction.note_id === note.id) && <p className="reaction-attribution">{interactions.reactions.filter(reaction => reaction.note_id === note.id).sort((a, b) => Number(b.user_id === userId) - Number(a.user_id === userId)).map(reaction => `${reaction.user_id === userId ? 'You' : 'Partner'} ${reaction.reaction}`).join(' · ')}</p>}{note.created_by === userId && !note.deliver_at && <div className="note-actions"><button disabled={saving} onClick={() => void editNote(note)}>Edit</button><button onClick={() => void remove(note)}><svg aria-hidden="true" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"/></svg>Delete</button></div>}</div>}
      </article>;
    })}</div>
    </div>
    <OurNotes key={`${userId ?? ''}:${household ?? ''}`} household={household} visible={tab === 'shared'} onDirty={setSharedDirty} />
  </section>;
}
