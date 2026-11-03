import { readPhoto } from '../family/petPhoto';
import { publicUrl } from './recipeImport';

// Social thumbnail URLs often expire; retain a compressed copy when the host allows it.
export async function importedSocialPhoto(value: string): Promise<string | null> {
  const url = publicUrl(value);
  if (!url || !/(^|\.)(?:tiktokcdn(?:-[a-z0-9]+)?\.com|tiktokv\.com|ibytedtos\.com|ibyteimg\.com|byteimg\.com|muscdn\.com|cdninstagram\.com|fbcdn\.net)$/i.test(new URL(url).hostname)) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() || '';
    if (!response.ok || !response.body || !['image/jpeg', 'image/png', 'image/webp'].includes(type)) return null;
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value: bytes } = await reader.read();
      if (done) break;
      size += bytes.byteLength;
      if (size > 8000000) { await reader.cancel(); return null; }
      chunks.push(bytes);
    }
    const photo = await readPhoto(new File(chunks as BlobPart[], 'recipe-photo', { type }));
    return photo.length <= 1400000 ? photo : null;
  } catch { return null; }
  finally { clearTimeout(timeout); }
}
