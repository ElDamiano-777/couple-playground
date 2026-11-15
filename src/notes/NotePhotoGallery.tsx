import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getNotePhotos } from './notePhotos';

export default function NotePhotos({ noteId, count, version }: { noteId: string; count: number; version: string }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    let active = true;
    void getNotePhotos(noteId).then(items => { if (active) { setPhotos(items); setError(''); } }).catch(() => { if (active) setError('Could not load photos. Please reopen this note.'); });
    return () => { active = false; };
  }, [noteId, count, version]);
  useEffect(() => {
    if (selected === null) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelected(null);
      if (event.key === 'ArrowRight') setSelected(index => index === null ? null : Math.min(index + 1, photos.length - 1));
      if (event.key === 'ArrowLeft') setSelected(index => index === null ? null : Math.max(index - 1, 0));
    };
    document.addEventListener('keydown', keydown);
    return () => { document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown); };
  }, [selected, photos.length]);
  return <>{error && <p role="alert">{error}</p>}<div className={`note-photo-gallery${photos.length === 1 ? ' single-photo' : ''}`}>{photos.map((photo, index) => <button key={index} onClick={() => setSelected(index)} aria-label={`Enlarge photo ${index + 1}`}><img src={photo} alt={`Note photo ${index + 1}`} /></button>)}</div>{selected !== null && photos[selected] && createPortal(<div className="note-photo-overlay" role="dialog" aria-modal="true" aria-label="Note photo" onTouchStart={event => { const touch = event.touches[0]; touchStart.current = touch ? { x: touch.clientX, y: touch.clientY } : null; }} onTouchEnd={event => {
    const touch = event.changedTouches[0], start = touchStart.current; touchStart.current = null;
    if (!touch || !start) return;
    const dx = touch.clientX - start.x, dy = touch.clientY - start.y;
    if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
    setSelected(index => index === null ? null : Math.max(0, Math.min(photos.length - 1, index + (dx < 0 ? 1 : -1))));
  }}><button className="note-photo-close" onClick={() => setSelected(null)}>Close</button><img src={photos[selected]} alt="Enlarged note photo" />{photos.length > 1 && <div className="note-photo-navigation"><button disabled={selected === 0} onClick={() => setSelected(selected - 1)} aria-label="Previous photo">‹</button><span aria-live="polite">{selected + 1} / {photos.length}</span><button disabled={selected === photos.length - 1} onClick={() => setSelected(selected + 1)} aria-label="Next photo">›</button></div>}</div>, document.body)}</>;
}
