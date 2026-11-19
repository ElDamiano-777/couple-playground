import { publicUrl } from '../collections/recipeImport';
import { prepareNotePhoto } from '../notes/notePhotos';

type Product = { title: string; price: string; image: string; currency: string; store: string; description: string };
function amazonPhoto(source: string): string {
  const url = new URL(source);
  if (url.hostname !== 'amazon.de' && !url.hostname.endsWith('.amazon.de')) return '';
  const asin = /\/(?:dp|gp\/product|gp\/aw\/d)\/([a-z0-9]{10})(?:\/|$)/i.exec(url.pathname)?.[1];
  return asin ? `https://images-eu.ssl-images-amazon.com/images/P/${asin.toUpperCase()}.01.LZZZZZZZ.jpg` : '';
}
function findProduct(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) { for (const item of value) { const result = findProduct(item); if (result) return result; } }
  else if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (types.some(type => typeof type === 'string' && /(?:^|\/)Product(?:Group)?$/i.test(type))) return item;
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
function productPrice(value: unknown, currency: unknown): string {
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/i.test(currency)) return '';
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
  const variants = product?.hasVariant;
  const variant = (Array.isArray(variants) ? variants[0] : variants) as Record<string, unknown> | undefined;
  const offers = product?.offers ?? variant?.offers;
  const offer = (Array.isArray(offers) ? offers[0] : offers) as Record<string, unknown> | undefined;
  const amazon = !!amazonPhoto(source);
  const title = (typeof product?.name === 'string' ? product.name : meta('og:title') || (amazon ? doc.querySelector('#productTitle')?.textContent ?? '' : '')).trim().slice(0, 150);
  // Keep Amazon prices scoped to the main offer, never recommendations or crossed-out prices.
  const amazonPrice = amazon ? doc.querySelector('#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price) .a-offscreen, #corePrice_feature_div .a-price:not(.a-text-price) .a-offscreen, #priceblock_ourprice, #priceblock_dealprice')?.textContent?.trim() ?? '' : '';
  const rawCurrency = offer?.priceCurrency ?? (meta('product:price:currency') || (/€/.test(amazonPrice) ? 'EUR' : ''));
  const currency = typeof rawCurrency === 'string' && /^[A-Z]{3}$/i.test(rawCurrency) ? rawCurrency.toUpperCase() : '';
  const price = productPrice(offer?.price ?? (meta('product:price:amount') || amazonPrice.replace(/\s|€/g, '').replace(/\.(?=\d{3}(?:[,.]|$))/g, '')), currency);
  const amazonImage = amazon ? doc.querySelector<HTMLImageElement>('#landingImage, #imgBlkFront') : null;
  const image = imageUrl(product?.image ?? variant?.image ?? (meta('og:image') || amazonImage?.getAttribute('data-old-hires') || amazonImage?.getAttribute('src')), source);
  const store = (meta('og:site_name') || new URL(source).hostname.replace(/^www\./, '')).slice(0, 150);
  const rawDescription = typeof product?.description === 'string' ? product.description : meta('og:description') || meta('description');
  const description = (new DOMParser().parseFromString(rawDescription, 'text/html').body.textContent ?? '').trim().slice(0, 20000);
  return { title, price, image, currency, store, description };
}

/** Browsers can read only pages and images that explicitly permit cross-origin access. */
export async function importProductLink(value: string, signal: AbortSignal): Promise<Product> {
  const source = publicUrl(value);
  if (!source) throw new Error('Invalid product link');
  // Use the existing public reader only when the store does not allow direct browser access.
  // Never forward links containing common authentication or personal query parameters.
  const load = async (address: string, reader: boolean) => {
    const response = await fetch(address, { signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow', ...(reader ? { headers: { 'X-Return-Format': 'html' } } : {}) });
    if (!response.ok) throw new Error('Product page unavailable');
    if (Number(response.headers.get('content-length') || 0) > 2000000) throw new Error('Product page too large');
    const html = await response.text();
    if (html.length > 2000000) throw new Error('Product page too large');
    const product = parseProduct(html, reader ? source : (publicUrl(response.url) || source));
    if (!product.title && !product.price && !product.image) throw new Error('No product details found');
    return product;
  };
  try { return await load(source, false); }
  catch (error) {
    if (signal.aborted) throw error;
    const parsed = new URL(source);
    if ([...parsed.searchParams.keys()].some(key => /token|auth|session|email|secret|password|key/i.test(key))) throw error;
    try { return await load(`https://r.jina.ai/${source}`, true); }
    catch (readerError) {
      if (signal.aborted) throw readerError;
      // Amazon's public ASIN image can still be available when its product page is blocked.
      const image = amazonPhoto(source);
      if (!image) throw readerError;
      return { title: '', price: '', image, currency: '', store: parsed.hostname.replace(/^www\./, ''), description: '' };
    }
  }
}

export async function importProductPhoto(url: string, signal: AbortSignal): Promise<string> {
  const image = await fetch(url, { signal, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer' });
  if (!image.ok || Number(image.headers.get('content-length') || 0) > 20 * 1024 * 1024) throw new Error('Product image unavailable');
  const blob = await image.blob();
  if (!blob.type.startsWith('image/') || blob.size > 20 * 1024 * 1024) throw new Error('Product image unavailable');
  const bitmap = await createImageBitmap(blob);
  try {
    // Amazon returns a one-pixel placeholder for ASINs without a public image.
    if (bitmap.width < 2 || bitmap.height < 2) throw new Error('Product image unavailable');
  } finally { bitmap.close(); }
  return prepareNotePhoto(new File([blob], 'product', { type: blob.type }));
}
