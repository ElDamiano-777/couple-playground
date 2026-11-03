import { BrowserMultiFormatReader } from '@zxing/browser';
import { createWorker } from 'tesseract.js';
import type { FavoriteDraft } from './useShoppingFavorites';

type Recognized = Pick<FavoriteDraft, 'name' | 'brand' | 'flavor' | 'size' | 'quantity' | 'notes'>;
export type ProductRecognition = { fields: Recognized; source: 'barcode' | 'text'; photo: string | null };
const empty = (): Recognized => ({ name: '', brand: '', flavor: '', size: '', quantity: '', notes: '' });

export function recognizeVisibleText(text: string): Recognized {
  const clean = text.replace(/\s+/g, ' ').trim();
  const fields = empty();
  if (/lavazza/i.test(clean)) { fields.brand = 'Lavazza'; fields.name = 'Coffee'; }
  const flavor = clean.match(/\b(crema\s+e\s+aroma)\b/i);
  if (flavor) fields.flavor = flavor[1].toLocaleLowerCase().replace(/\b\w/g, character => character.toUpperCase());
  const size = clean.match(/\b\d+(?:[.,]\d+)?\s?(?:kg|g|ml|cl|l)\b/i);
  if (size) fields.quantity = size[0].trim().replace(/\s+/, ' ');
  if (!fields.name) {
    const food = text.split(/\r?\n/).map(line => line.replace(/\s+/g, ' ').trim()).find(line =>
      line.length >= 3 && line.length <= 80 && /\p{L}{3}/u.test(line) &&
      /(?:wurst|käse|joghurt|milch|butter|brot|kaffee|tee|saft|wasser|nudeln|reis|suppe|salat|schinken|puten|huhn|fleisch|pizza|müsli|schokolade)/i.test(line) &&
      !/\b(?:zutaten|ingredients|nährwert|mindestens haltbar|netto)\b/i.test(line));
    if (food) fields.name = food.replace(/\b\p{L}/gu, character => character.toLocaleUpperCase()).replace(/\B\p{Lu}+/gu, word => word.toLocaleLowerCase());
  }
  return fields;
}

function fromProduct(product: Record<string, unknown>): Recognized {
  const fields = empty();
  const title = typeof product.product_name === 'string' ? product.product_name.trim() : '';
  const brand = typeof product.brands === 'string' ? product.brands.split(',')[0].trim() : '';
  const quantity = typeof product.quantity === 'string' ? product.quantity.trim() : '';
  fields.name = title || '';
  fields.brand = brand;
  fields.quantity = quantity;
  if (title && brand && title.toLocaleLowerCase().startsWith(brand.toLocaleLowerCase())) fields.flavor = title.slice(brand.length).replace(/^\s*[-–,:]?\s*/, '');
  return fields;
}

function productPhoto(product: Record<string, unknown>) {
  const candidate = typeof product.image_front_url === 'string' ? product.image_front_url : typeof product.image_url === 'string' ? product.image_url : '';
  try {
    const url = new URL(candidate);
    return url.protocol === 'https:' && url.hostname.endsWith('openfoodfacts.org') ? url.href : null;
  } catch { return null; }
}

async function barcodeFromImage(photo: string) {
  const reader = new BrowserMultiFormatReader();
  try { return (await reader.decodeFromImageUrl(photo)).getText(); } catch { return ''; }
}

export async function recognizeBarcode(code: string): Promise<ProductRecognition> {
  if (!code) return { fields: empty(), source: 'barcode', photo: null };
  const fields = 'product_name,brands,quantity,image_front_url,image_url';
  const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`, { headers: { Accept: 'application/json' } });
  if (!response.ok) return { fields: empty(), source: 'barcode', photo: null };
  const body = await response.json() as { product?: Record<string, unknown>; status?: number };
  return body.status === 1 && body.product
    ? { fields: fromProduct(body.product), source: 'barcode', photo: productPhoto(body.product) }
    : { fields: empty(), source: 'barcode', photo: null };
}

export async function recognizeProduct(photo: string): Promise<ProductRecognition> {
  const barcode = await barcodeFromImage(photo);
  const barcodeResult = await recognizeBarcode(barcode);
  if (barcode) return barcodeResult;
  const worker = await createWorker('eng+deu');
  try {
    const result = await worker.recognize(photo);
    return { fields: recognizeVisibleText(result.data.text), source: 'text', photo: null };
  } finally { await worker.terminate(); }
}
