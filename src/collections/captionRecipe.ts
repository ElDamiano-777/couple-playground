export type CaptionSections = { ingredients: string; instructions: string; remainder: string };

const firstInstruction = /^(?:step\s*)?1[.)、]\s*(?:(?:mix|stir|combine|whisk|add|heat|preheat|bake|cook|slice|chop|place|pour|wash|fry|fold|grate|boil|spread)\b|(?:смеш|взбей|добав|нареж|разогрей|выпек|обжар|соедин|приготов|перемеш|вылож|запек|свар|налей))/iu;

// Only use text explicitly labelled by the author; keep uncertain text in the caption.
export function captionSections(caption: string): CaptionSections {
  const ingredients: string[] = [], instructions: string[] = [], remainder: string[] = [];
  let section: 'ingredients' | 'instructions' | null = null;
  const labels = 'ingredients?|zutaten|ingredientes|ингредиенты|продукты|состав|instructions?|directions?|method|steps?|zubereitung|preparaci[oó]n|приготовление|способ приготовления|как приготовить|инструкция';
  const separated = caption.replace(/\r\n?/g, '\n')
    .replace(/[＊*]\s*(材料|作り方)\s*[＊*]/g, '\n$1:\n')
    .replace(new RegExp(`(?:^|\\s)(${labels})\\s*[:：]`, 'giu'), '\n$1:\n');
  const heading = new RegExp(`^(${labels}|材料|作り方)\\s*(?:[:：]|$)\\s*(.*)$`, 'iu');
  const ingredientHeading = /^(?:ingredients?|zutaten|ingredientes|ингредиенты|продукты|состав|材料)$/iu;
  for (const line of separated.split('\n')) {
    const text = line.trim();
    if (!text) continue;
    const header = text.replace(/^[^\p{L}\p{N}]*/u, '').replace(/[*＊]/g, '').replace(/[^\p{L}\p{N}:：]+$/u, '');
    const start = heading.exec(header);
    if (start) {
      section = ingredientHeading.test(start[1]) ? 'ingredients' : 'instructions';
      // Read the actual text after the heading, not the cleaned heading copy.
      if (start[2]) (section === 'ingredients' ? ingredients : instructions).push(start[2]);
      continue;
    }
    if (/^(?:notes?|tips?|hashtags?|hinweise|notas|примечания|советы)\s*[:：]/iu.test(header) || /コツ$/u.test(header) || /^(?:#|@|https?:\/\/)/i.test(text)) section = null;
    if (section === 'ingredients' && ingredients.length && firstInstruction.test(text.replace(/([0-9])\uFE0F?\u20E3/g, '$1. '))) section = 'instructions';
    if (section === 'ingredients') ingredients.push(text);
    else if (section === 'instructions') instructions.push(text);
    else remainder.push(text);
  }
  // Unlabelled captions are only split when a measured list directly precedes numbered steps.
  if (!ingredients.length && !instructions.length) {
    const lines = caption.replace(/\r\n?/g, '\n').split('\n').map(line => line.trim()).filter(Boolean);
    const step = lines.findIndex(line => firstInstruction.test(line.replace(/([0-9])\uFE0F?\u20E3/g, '$1. ')));
    if (step > 1) {
      let start = step;
      while (start > 0 && /^(?:[•●▪◦▢☐□*–-]\s*)?(?:\d+(?:[.,]\d+)?(?:\s+\d+\/\d+|\/\d+|\s*[¼½¾⅓⅔⅛⅜⅝⅞])?|[¼½¾⅓⅔⅛⅜⅝⅞])\s*\p{L}/u.test(lines[start - 1]) && !/^\d+\s+ingredients?\b/i.test(lines[start - 1])) start--;
      if (step - start >= 2) {
        let end = step;
        while (end < lines.length && !/^(?:#|@|https?:\/\/|notes?\s*[:：]|tips?\s*[:：]|примечания\s*[:：]|советы\s*[:：])/iu.test(lines[end])) end++;
        ingredients.push(...lines.slice(start, step));
        instructions.push(...lines.slice(step, end));
        remainder.length = 0;
        remainder.push(...lines.slice(0, start), ...lines.slice(end));
      }
    }
  }
  const ingredientLines = ingredients.flatMap(splitFlatIngredients);
  // A flattened line with multiple amounts cannot safely be split without clear boundaries.
  const ambiguous = ingredientLines.some(line => {
    const outside = line.replace(/\([^)]*\)/g, '').replace(/\b\d+\s+\d+\/\d+/g, 'fraction').replace(/\b\d+\s*[-–]\s*\d+/g, 'range');
    return (outside.match(/\d+(?:[.,]\d+)?(?:\/\d+)?/g) || []).length > 1 && !/(?:^|\s)(?:or|или)(?=\s|$)/iu.test(outside);
  });
  const normalizedInstructions = instructions.map(line => line.replace(/([0-9])\uFE0F?\u20E3/g, '$1. '));
  const numbered = normalizedInstructions.some(line => /^(?:step\s*)?\d+[.)、](?=\s|[^\d])/iu.test(line));
  const steps: string[] = [];
  for (const line of normalizedInstructions) {
    const pieces = numbered ? line.replace(/\s+(?=(?:step\s*)?\d+[.)、](?=\s|[^\d]))/giu, '\n').split('\n') : [line];
    for (const piece of pieces) {
      if (numbered && steps.length && !/^(?:step\s*)?\d+[.)、](?=\s|[^\d])/iu.test(piece)) steps[steps.length - 1] += ` ${piece}`;
      else steps.push(piece);
    }
  }
  return { ingredients: ambiguous ? '' : ingredientLines.join('\n').slice(0, 20000), instructions: steps.join('\n').slice(0, 20000), remainder: remainder.join('\n').slice(0, 20000) };
}

function splitFlatIngredients(line: string): string[] {
  const unit = '(?:kg|mg|g|ml|l|oz|lbs?|cups?|tbsp|tsp|tablespoons?|teaspoons?|eggs?|cloves?|cans?|slices?|ст\\.?\\s*л\\.?|ч\\.?\\s*л\\.?|кг|г|мл|л|яйц[ао]?|шт\\.?)';
  const pattern = new RegExp(`(?:^|\\s)(?=\\d+(?:[.,]\\d+)?(?:\\s+\\d+\\/\\d+|\\/\\d+|\\s*[¼½¾⅓⅔⅛⅜⅝⅞])?\\s*${unit}(?!\\p{L}))`, 'giu');
  const positions = [...line.matchAll(pattern)].map(match => match.index! + match[0].length);
  if (positions.length < 2 || positions[0] !== 0) return [line];
  const outsideParens = (index: number) => {
    let depth = 0;
    for (const char of line.slice(0, index)) { if (char === '(') depth++; else if (char === ')') depth = Math.max(0, depth - 1); }
    return depth === 0;
  };
  const cuts = positions.filter(outsideParens);
  if (cuts.length < 2) return [line];
  return cuts.map((start, index) => line.slice(start, cuts[index + 1] ?? line.length).trim()).filter(Boolean);
}

// Use only an actual first line; never invent a title for an unlabelled caption.
export function captionTitle(caption: string): string {
  const line = caption.split(/\r?\n/).map(value => value.trim()).find(Boolean) || '';
  const text = line.replace(/^[^\p{L}\p{N}]+/u, '').trim();
  if (/^#/.test(line)) return '';
  const named = /^(?:recipe|rezept|рецепт|название|title)\s*[:：-]\s*(.+)$/iu.exec(text)?.[1].trim();
  if (named && named.length <= 150) return named;
  if (!text || text.length > 150 || /^(?:#|\d|[¼½¾⅓⅔⅛⅜⅝⅞])/.test(text) || /^(?:ingredients?|instructions?|method|directions?|recipe|rezept|рецепт|zutaten|ингредиенты|приготовление|способ приготовления)(?=\s|[:：]|$)/iu.test(text)) return '';
  return text;
}
