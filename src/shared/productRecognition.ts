import { BrowserMultiFormatReader } from '@zxing/browser';
import { createWorker } from 'tesseract.js';
import type { FavoriteDraft } from './useShoppingFavorites';

type Recognized = Pick<FavoriteDraft, 'name' | 'brand' | 'flavor' | 'size' | 'quantity' | 'notes'>;
const empty = (): Recognized => ({ name: '', brand: '', flavor: '', size: '', quantity: '', notes: '' });

export function recognizeVisibleText(text: string): Recognized {
  const clean = text.replace(/\s+/g, ' ').trim();
  const fields = empty();
  if (/lavazza/i.test(clean)) { fields.brand = 'Lavazza'; fields.name = 'Coffee'; }
  const flavor = clean.match(/\b(crema\s+e\s+aroma)\b/i);
  if (flavor) fields.flavor = flavor[1].toLocaleLowerCase().replace(/\b\w/g, character => character.toUpperCase());
  const size = clean.match(/\b\d+(?:[.,]\d+)?\s?(?:kg|g|ml|cl|l)\b/i);
  if (size) fields.quantity = size[0].trim().replace(/\s+/, ' ');
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

async function barcodeFromImage(photo: string) {
  const reader = new BrowserMultiFormatReader();
  try { return (await reader.decodeFromImageUrl(photo)).getText(); } catch { return ''; }
}

async function lookupBarcode(code: string) {
  if (!code) return empty();
  const response = await fetch(`https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}.json`, { headers: { Accept: 'application/json' } });
  if (!response.ok) return empty();
  const body = await response.json() as { product?: Record<string, unknown>; status?: number };
  return body.status === 1 && body.product ? fromProduct(body.product) : empty();
}

export async function recognizeProduct(photo: string) {
  const barcode = await barcodeFromImage(photo);
  const barcodeFields = await lookupBarcode(barcode);
  if (barcodeFields.name || barcodeFields.brand || barcodeFields.quantity) return { fields: barcodeFields, source: 'barcode' as const };
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(photo);
    return { fields: recognizeVisibleText(result.data.text), source: 'text' as const };
  } finally { await worker.terminate(); }
}
