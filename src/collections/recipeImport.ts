export type ImportedRecipe = { title: string; category: string; minutes: string; image: string; ingredients: string; instructions: string };

export function publicUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    const host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || value.length > 4096 || !host.includes('.') || /^(?:\d+\.)*\d+$/.test(host) || /(^|\.)(?:localhost|local|internal)$/.test(host) || host.includes(':')) return null;
    return url.href;
  } catch { return null; }
}

function sourceToFetch(source: string, depth = 0): string | null {
  if (depth > 2) return null;
  const url = new URL(source);
  if (/(^|\.)(instagram\.com|tiktok\.com|pinterest\.[a-z.]+|pin\.it)$/.test(url.hostname)) return null;
  if (/(^|\.)google\.[a-z.]+$/.test(url.hostname)) {
    const target = url.searchParams.get('url') || url.searchParams.get('q');
    const redirected = target && publicUrl(target);
    return redirected ? sourceToFetch(redirected, depth + 1) : null;
  }
  return source;
}

function clean(value: unknown): string {
  if (typeof value !== 'string') return '';
  const element = document.createElement('textarea');
  element.innerHTML = value.replace(/<[^>]*>/g, ' ');
  return element.value.replace(/[\t\r ]+/g, ' ').trim();
}
function instructionText(value: unknown): string[] {
  if (typeof value === 'string') return [clean(value)].filter(Boolean);
  if (Array.isArray(value)) return value.flatMap(instructionText);
  if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    return item.itemListElement ? instructionText(item.itemListElement) : instructionText(item.text ?? item.name);
  }
  return [];
}
function findRecipe(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    for (const item of value) { const recipe = findRecipe(item); if (recipe) return recipe; }
  } else if (value && typeof value === 'object') {
    const item = value as Record<string, unknown>;
    const types = Array.isArray(item['@type']) ? item['@type'] : [item['@type']];
    if (types.some(type => typeof type === 'string' && /(?:^|\/)Recipe$/i.test(type))) return item;
    if (item['@graph']) return findRecipe(item['@graph']);
  }
  return null;
}
function imageUrl(value: unknown, base: string): string {
  if (Array.isArray(value)) return value.map(item => imageUrl(item, base)).find(Boolean) || '';
  if (value && typeof value === 'object') return imageUrl((value as Record<string, unknown>).url ?? (value as Record<string, unknown>).contentUrl, base);
  if (typeof value !== 'string') return '';
  try { return publicUrl(new URL(value, base).href) || ''; } catch { return ''; }
}
function minutes(value: unknown): string {
  if (typeof value !== 'string') return '';
  const match = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i.exec(value);
  if (!match) return '';
  const total = Number(match[1] || 0) * 1440 + Number(match[2] || 0) * 60 + Number(match[3] || 0) + Math.ceil(Number(match[4] || 0) / 60);
  return total >= 1 && total <= 10080 ? String(total) : '';
}
export function parseRecipe(html: string, source: string): ImportedRecipe | null {
  const scripts = html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi);
  for (const script of scripts) {
    let recipe: Record<string, unknown> | null;
    try { recipe = findRecipe(JSON.parse(script[1])); } catch { continue; }
    if (!recipe) continue;
    const rawCategory = Array.isArray(recipe.recipeCategory) ? recipe.recipeCategory.join(' ') : String(recipe.recipeCategory ?? '');
    const category = ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Desserts'].find(item => new RegExp(`\\b${item.replace(/s$/, 's?')}\\b`, 'i').test(rawCategory)) || '';
    return {
      title: clean(recipe.name).slice(0, 150), category,
      minutes: minutes(recipe.prepTime),
      image: imageUrl(recipe.image, source),
      ingredients: (Array.isArray(recipe.recipeIngredient) ? recipe.recipeIngredient.map(clean).filter(Boolean).join('\n') : '').slice(0, 20000),
      instructions: instructionText(recipe.recipeInstructions).join('\n').slice(0, 20000),
    };
  }
  return null;
}

export async function importRecipe(source: string): Promise<ImportedRecipe | null> {
  const target = sourceToFetch(source);
  if (!target) return null;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`https://r.jina.ai/${target}`, { headers: { 'X-Return-Format': 'html' }, signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!response.ok || !response.body) throw new Error('Recipe page unavailable');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let html = '', size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 3000000) { await reader.cancel(); throw new Error('Recipe page too large'); }
      html += decoder.decode(value, { stream: true });
    }
    html += decoder.decode();
    return parseRecipe(html, target);
  } finally { clearTimeout(timeout); }
}
