/** Compress a private memory photo without changing its aspect ratio. */
export async function prepareMemoryPhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type.toLowerCase())) throw new Error('Choose a JPEG, PNG, WebP or HEIC photo.');
  if (file.size > 20 * 1024 * 1024) throw new Error('Each photo must be smaller than 20 MB.');
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw new Error('Could not open a photo. Try a JPEG or PNG image.'); }
  try {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not prepare this photo.');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let data = canvas.toDataURL('image/jpeg', 0.82);
    if (data.length > 700000) data = canvas.toDataURL('image/jpeg', 0.58);
    if (data.length > 700000) throw new Error('This photo is too large to save. Try a smaller image.');
    return data;
  } finally { bitmap.close(); }
}
