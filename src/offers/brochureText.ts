// Turns text recognised on a Brochure screenshot into Offer candidates.
// Brochure layouts are busy, so this only proposes title + price pairs; a person
// checks every candidate before anything is saved.

import { createWorker } from 'tesseract.js';

export type OfferCandidate = { title: string; price_cents: number };

const pricePattern = /(?<![\d.,])(\d{1,3}|-)?[.,](\d{2})(?![\d%])(?!\s*(?:kg|g|l|ml|cl|%|x\b))/gi;
// Unit prices, deposits, crossed-out prices and dates: never the Offer itself.
const skipLine = /(?:\b(?:kg|l|g|ml|stück|stk)\s*=|grundpreis|pfand|statt|\buvp\b|ersparnis|\d{1,2}\.\d{1,2}\.(?:\d{2,4})?)/i;
// Advertising words: such a line is no product name.
const notName = /(?:gültig|angebot|aktion|preis|filiale|www\.|\bab\b\s+(?:mo|di|mi|do|fr|sa))/i;

function prices(line: string) {
  const found: number[] = [];
  for (const match of line.matchAll(pricePattern)) {
    const euros = !match[1] || match[1] === '-' ? 0 : Number(match[1]);
    const cents = euros * 100 + Number(match[2]);
    if (cents >= 5 && cents <= 50000) found.push(cents);
  }
  return found;
}

function cleanTitle(lines: string[]) {
  return lines.join(' ').replace(/[|_~*•·]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}

const looksLikeName = (line: string) => /\p{L}{3}/u.test(line) && !notName.test(line) && !skipLine.test(line) && prices(line).length === 0 && line.length <= 80;

export function parseBrochureText(text: string): OfferCandidate[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const candidates: OfferCandidate[] = [];
  let names: string[] = [];
  for (const line of lines) {
    const found = skipLine.test(line) ? [] : prices(line);
    if (!found.length) {
      if (looksLikeName(line)) names = [...names, line].slice(-3);
      continue;
    }
    // A name on the same line as the price wins over the lines above it.
    const inline = line.replace(pricePattern, ' ').replace(/[€*¹²]/g, ' ').replace(/\s+/g, ' ').trim();
    const title = cleanTitle(looksLikeName(inline) ? [inline] : names);
    if (title.length >= 3) {
      // Old and new price often share a line; the lower one is the Offer price.
      candidates.push({ title, price_cents: Math.min(...found) });
      names = [];
    }
  }
  const seen = new Set<string>();
  return candidates.filter(candidate => {
    const key = `${candidate.title.toLocaleLowerCase('de-DE')}|${candidate.price_cents}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function readBrochureScreenshots(files: File[]): Promise<OfferCandidate[]> {
  const worker = await createWorker('deu');
  try {
    const all: OfferCandidate[] = [];
    for (const file of files) {
      const result = await worker.recognize(file);
      all.push(...parseBrochureText(result.data.text));
    }
    return all.slice(0, 80);
  } finally { await worker.terminate(); }
}
