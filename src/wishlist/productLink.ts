import { publicUrl } from '../collections/recipeImport';
import { prepareNotePhoto } from '../notes/notePhotos';

type Product = { title: string; price: string; image: string };
function findProduct(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) { for (const item of value) { const result = findProduct(item); if (result) return result; } }
  else if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (types.some(type => typeof type === 'string' && /(?:^|\/)Product$/i.test(type))) return item;
    if (item['@graph']) return findProduct(item['@graph']);
  }
  return null;
}
function imageUrl(value: unknown, base: string): string {
  if (Array.isArray(value)) return value.map(item => imageUrl(item, base)).find(Boolean) || '';
  if (value && typeof value === 'object') return imageUrl((value as Record<string, unknown>).url ?? (value as Record<string, unknown>).contentUrl, base);
  if (typeof value !== 'string') return '';
  try { return publicUrl(new URL(value, base).href) ?? ''; } catch { return ''; }
}
function euroPrice(value: unknown, currency: unknown): string {
  if (typeof currency !== 'string' || currency.toUpperCase() !== 'EUR') return '';
  const raw = String(value ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw) || Number(raw) > 1000000) return '';
  return Number(raw).toFixed(2);
}
export function parseProduct(html: string, source: string): Product {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const meta = (name: string) => doc.querySelector<HTMLMetaElement>(`meta[property="${name}"], meta[name="${name}"]`)?.content.trim() ?? '';
  let product: Record<string, unknown> | null = null;
  for (const node of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try { product = findProduct(JSON.parse(node.textContent ?? '')); } catch { /* Other structured data may be malformed. */ }
    if (product) break;
  }
  const offers = product?.offers;
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
  const title = (typeof product?.name === 'string' ? product.name : meta('og:title')).trim().slice(0, 150);
  const price = euroPrice(offer?.price ?? meta('product:price:amount'), offer?.priceCurrency ?? meta('product:price:currency'));
  const image = imageUrl(product?.image ?? meta('og:image'), source);
  return { title, price, image };
}

/** Browsers can read only pages and images that explicitly permit cross-origin access. */
export async function importProductLink(value: string, signal: AbortSignal): Promise<Product> {
  const source = publicUrl(value);
  if (!source) throw new Error('Invalid product link');
  const response = await fetch(source, { signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow' });
  if (!response.ok || !publicUrl(response.url || source)) throw new Error('Product page unavailable');
  const size = Number(response.headers.get('content-length') || 0);
  if (size > 2000000) throw new Error('Product page too large');
  const html = await response.text();
  if (html.length > 2000000) throw new Error('Product page too large');
  const product = parseProduct(html, response.url || source);
  if (!product.title && !product.price && !product.image) throw new Error('No product details found');
  return product;
}

export async function importProductPhoto(url: string, signal: AbortSignal): Promise<string> {
  const image = await fetch(url, { signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!image.ok || Number(image.headers.get('content-length') || 0) > 20 * 1024 * 1024) throw new Error('Product image unavailable');
  const blob = await image.blob();
  if (!blob.type.startsWith('image/') || blob.size > 20 * 1024 * 1024) throw new Error('Product image unavailable');
  return prepareNotePhoto(new File([blob], 'product', { type: blob.type }));
}
