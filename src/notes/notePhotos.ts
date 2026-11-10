import { supabase } from '../shared/client';

export async function prepareNotePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type.toLowerCase())) throw new Error('Choose a JPEG, PNG, WebP or HEIC photo.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Each photo must be smaller than 20 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Could not open this photo. Try a JPEG or PNG image.'); }
  try {
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/jpeg', 0.85);
    if (data.length > 1400000) data = canvas.toDataURL('image/jpeg', 0.7);
    if (!data.startsWith('data:image/jpeg;base64,') || data.length > 1400000) throw new Error('This photo is too large to save.');
    return data;
  } finally { bitmap.close(); }
}

export async function getNotePhotos(noteId: string): Promise<string[]> {
  const result = await supabase.from('partner_note_photos').select('data_url').eq('note_id', noteId).order('position');
  if (result.error) throw new Error('Could not load photos. Please try again.');
  return (result.data ?? []).map(row => row.data_url);
}
