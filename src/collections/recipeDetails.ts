export type Ingredient = { text: string; name: string; quantity: string; alternative: string; heading: boolean };

function tidyLine(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/<\/?[a-z][^>]*>/gi, ' ').replace(/\*\*/g, '')
    .replace(/^\s*(?:[•●▪◦▢☐□]|[-*])\s*/, '').replace(/[\t ]+/g, ' ').trim();
}

export function ingredientDetails(value: string): { ingredients: Ingredient[]; notes: string[] } {
  const ingredients: Ingredient[] = [], notes: string[] = [];
  let inNotes = false;
  for (const raw of value.split(/\r?\n/)) {
    const text = tidyLine(raw);
    if (!text) continue;
    const note = /^(?:notes?|tips?|alternatives?|substitutions?)\s*:\s*(.*)$/i.exec(text);
    if (note) { inNotes = true; if (note[1]) notes.push(note[1]); continue; }
    if (inNotes && /^ingredients?\s*:\s*$/i.test(text)) { inNotes = false; continue; }
    if (inNotes) { notes.push(text); continue; }
    if (/^for\s+.+:$/i.test(text)) { ingredients.push({ text, name: text, quantity: '', alternative: '', heading: true }); continue; }
    const alt = /(?:\s*\(((?:or|alternatively|substitute|или)(?=\s|$)[^)]*)\)|\s+((?:or|alternatively|substitute|или)(?=\s|$).+))\s*$/i.exec(text);
    const extracted = alt ? text.slice(0, alt.index).trim() : '';
    const main = extracted || text;
    const match = /^(\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+|\s*[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])?(?:\s*[-–]\s*(?:\d+(?:[.,]\d+)?(?:\/\d+)?|[¼½¾⅓⅔⅛⅜⅝⅞]))?|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞])(?:\s*(kg|g|mg|ml|l|oz|lbs?|pounds?|grams?|kilograms?|lit(?:er|re)s?|millilit(?:er|re)s?|cups?|tablespoons?|tbsp\.?|teaspoons?|tsp\.?|pinch(?:es)?|cans?|cloves?|slices?|pieces?|кг|мг|г|мл|л|шт\.?|ст\.?\s*л\.?|ч\.?\s*л\.?)(?!\p{L})\.?)?\s+(.+)$/iu.exec(main);
    const quantity = match ? [match[1], match[2]].filter(Boolean).join(' ') : '';
    const name = match ? match[3] : main;
    const alternative = extracted ? (alt?.[1] ?? alt?.[2] ?? '') : '';
    if (alternative) notes.push(`${name}: ${alternative}`);
    ingredients.push({ text, name, quantity, alternative, heading: false });
  }
  return { ingredients, notes };
}

export function instructionSteps(value: string): string[] {
  const lines = value.split(/\r?\n/).map(tidyLine).map(line => line.replace(/^(?:step\s+\d+\s*[:.)-]?\s*|\d+[.)、](?=\s|[^\d])\s*)/i, '').trim()).filter(Boolean);
  const normalized = (line: string) => line.replace(/\s+/g, ' ').toLocaleLowerCase();
  const unique = lines.filter((line, index) => index === 0 || normalized(line) !== normalized(lines[index - 1]));
  for (let size = Math.min(50, Math.floor(unique.length / 2)); size >= 2; size--) {
    for (let index = 0; index + size * 2 <= unique.length; index++) {
      if (normalized(unique[index]) === normalized(unique[index + size]) && unique.slice(index, index + size).every((line, offset) => normalized(line) === normalized(unique[index + size + offset]))) {
        unique.splice(index + size, size);
        index--;
      }
    }
  }
  return unique;
}

export function shoppingIngredient(item: Ingredient): { name: string; notes: string } {
  // Shopping names are limited to 200 characters; retain any excess in details.
  const characters = Array.from(item.name);
  const name = characters.slice(0, 200).join('').trim();
  const remainder = characters.slice(200).join('').trim();
  return { name, notes: [item.quantity, remainder, item.alternative].filter(Boolean).join(' · ') };
}
