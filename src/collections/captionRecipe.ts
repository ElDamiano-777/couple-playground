export type CaptionSections = { ingredients: string; instructions: string; remainder: string };

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
    if (/^(?:notes?|tips?|hashtags?|hinweise|notas|примечания|советы)\s*[:：]/iu.test(header) || /コツ$/u.test(header) || /^#/.test(text)) section = null;
    if (section === 'ingredients') ingredients.push(text);
    else if (section === 'instructions') instructions.push(text);
    else remainder.push(text);
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
