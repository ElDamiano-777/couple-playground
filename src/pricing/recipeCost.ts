import { products, type Product } from './productPrices';

export type PricedLine = { product: Product | null; cost: number | null; staple: boolean };
export type RecipeCost = { total: number; perServing: number | null; missing: number; lines: PricedLine[] };

const keyIndex = products.flatMap(product => product.keys.map(key => ({ key, product }))).sort((a, b) => b.key.length - a.key.length);
const letter = /[a-zäöüß]/;

function findProduct(name: string): Product | null {
  for (const { key, product } of keyIndex) {
    let from = name.indexOf(key);
    while (from !== -1) {
      const wordStart = from === 0 || !letter.test(name[from - 1]);
      const wordEnd = key.length > 3 || !letter.test(name[from + key.length] ?? ' ');
      if (wordStart && wordEnd) return product;
      from = name.indexOf(key, from + 1);
    }
  }
  return null;
}

const fractions: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75 };
function quantity(value: string): number {
  if (fractions[value] !== undefined) return fractions[value];
  const fraction = /^(\d+)\/(\d+)$/.exec(value);
  return fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(value.replace(',', '.'));
}

const looseWords = /^(?:n\.\s*b\.|evtl\.|einige|etwas|viel|ca\.)\s*/;
const modifiers = /(?:^|\s|,)(?:gestr\.|gehäuft|gr\.|m\.-große|große|kleine|kleiner|kleines|großes|großer)(?=[\s,]|$)/g;
const measured: Record<string, number> = { g: 1, kg: 1000, ml: 1, l: 1000, liter: 1000, el: 15, tl: 5, tasse: 200 };
const tiny = new Set(['prise', 'msp', 'msp.', 'tropfen', 'spritzer', 'schuss']);
const packWords = new Set(['dose', 'pck', 'pck.', 'pkt', 'pkt.', 'paket', 'packung', 'glas', 'tube', 'becher', 'topf', 'kugel']);

/** Rough cost of one ingredient line such as "250 g Nudeln (Reisnudeln)". */
export function lineCost(text: string): PricedLine {
  let rest = text.toLowerCase().replace(/\((?:e|n|s)\)/g, '').replace(/\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const unspecified = looseWords.test(rest);
  rest = rest.replace(looseWords, '').replace(modifiers, ' ').trim();
  let amount = 1, hasAmount = false;
  const number = /^(\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾])(?:\s*-\s*(\d+(?:[.,]\d+)?))?\s*/.exec(rest);
  if (number) {
    const first = quantity(number[1]);
    amount = number[2] ? (first + quantity(number[2])) / 2 : first;
    hasAmount = true;
    rest = rest.slice(number[0].length);
  }
  if (/^halbe[rsn]?\s/.test(rest)) { amount *= 0.5; rest = rest.replace(/^halbe[rsn]?\s/, ''); hasAmount = true; }
  const unitMatch = /^([a-zäöüß.]+?)(?:\/[a-zäöüß]+)?(?=[\s,]|$)\s*/.exec(rest);
  let unit = '';
  if (unitMatch && (unitMatch[1] in measured || tiny.has(unitMatch[1]) || packWords.has(unitMatch[1]) || ['bund', 'stück', 'zehe', 'zehen', 'stange', 'knolle', 'scheibe', 'blatt', 'blätter', 'zweig', 'stiel', 'kopf', 'handvoll', 'würfel', 'liter'].includes(unitMatch[1]))) {
    unit = unitMatch[1]; rest = rest.slice(unitMatch[0].length);
  }
  const product = findProduct(rest.replace(/^[,\s]+/, ''));
  if (!product) return { product: null, cost: null, staple: false };
  if (product.staple) return { product, cost: 0, staple: true };

  let baseAmount: number | null;
  const override = product.use?.[unit];
  if (!hasAmount || unspecified) baseAmount = product.pack * 0.25;
  else if (override !== undefined) baseAmount = amount * override;
  else if (unit in measured) {
    const grams = amount * measured[unit];
    // A spoon of a fresh item without a known weight (e.g. ground coriander) is a spice: no cost.
    baseAmount = product.unit === 'pc' ? (product.pieceG ? grams / product.pieceG : unit === 'el' || unit === 'tl' ? 0 : null) : grams;
  } else if (tiny.has(unit)) baseAmount = product.pack * 0.02;
  else if (packWords.has(unit)) baseAmount = amount * product.pack;
  else if (unit === 'handvoll') baseAmount = product.pack * 0.2 * amount;
  else if (product.unit === 'pc') baseAmount = amount;
  else baseAmount = product.pieceG ? amount * product.pieceG : null;
  if (baseAmount === null) return { product, cost: null, staple: false };
  return { product, cost: (baseAmount / product.pack) * product.price, staple: false };
}

export function servingCount(servings: string | null): number | null {
  const count = Number(/\d+/.exec(servings ?? '')?.[0]);
  return count >= 1 ? count : null;
}

export function recipeCost(ingredientTexts: string[], servings: string | null): RecipeCost {
  const lines = ingredientTexts.map(lineCost);
  const total = lines.reduce((sum, line) => sum + (line.cost ?? 0), 0);
  const count = servingCount(servings);
  return { total, perServing: count ? total / count : null, missing: lines.filter(line => line.cost === null).length, lines };
}

export const euro = (value: number) => value.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
