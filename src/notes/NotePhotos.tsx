import { useEffect, useState } from 'react';
import { getNotePhotos } from './notePhotos';

export default function NotePhotos({ noteId, count, version }: { noteId: string; count: number; version: string }) {
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void getNotePhotos(noteId).then(items => { if (active) { setPhotos(items); setError(''); } }).catch(() => { if (active) setError('Could not load photos. Please reopen this note.'); });
    return () => { active = false; };
  }, [noteId, count, version]);
  return <>{error && <p role="alert">{error}</p>}<div className="note-photo-gallery">{photos.map((photo, index) => <button key={index} onClick={() => setSelected(photo)} aria-label={`Enlarge photo ${index + 1}`}><img src={photo} alt={`Note photo ${index + 1}`} /></button>)}</div>{selected && <div className="note-photo-overlay" role="dialog" aria-label="Note photo"><button onClick={() => setSelected(null)}>Close</button><img src={selected} alt="Enlarged note photo" /></div>}</>;
}
