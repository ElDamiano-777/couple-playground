/* Shared, local illustrations. Unknown custom products use the neutral fallback. */
const productGroups: Record<string, string[]> = {
  carrot: ['carrot', 'carrots'], tomato: ['tomato', 'tomatoes'], cucumber: ['cucumber', 'cucumbers'], potato: ['potato', 'potatoes'], onion: ['onion', 'onions'], pepper: ['pepper', 'peppers', 'bell pepper', 'bell peppers'], lettuce: ['salad', 'lettuce'],
  apple: ['apple', 'apples'], banana: ['banana', 'bananas'], orange: ['orange', 'oranges'], berries: ['berry', 'berries'], grapes: ['grape', 'grapes'], vegetables: ['vegetables', 'vegetable'], fruit: ['fruit'],
  milk: ['milk', 'milk carton', 'whole milk', 'skimmed milk', 'semi skimmed milk', 'oat milk'], bread: ['bread', 'toast bread', 'toast'], rolls: ['rolls', 'roll'], bagel: ['bagel', 'bagels'], croissant: ['croissant', 'croissants'], egg: ['egg', 'eggs'], cheese: ['cheese', 'gouda', 'emmental', 'mozzarella', 'parmesan', 'sandwich cheese'], creamCheese: ['cream cheese', 'cottage cheese'], yogurt: ['yogurt', 'yoghurt'], butter: ['butter', 'spread'], cream: ['cream'],
  chicken: ['chicken', 'chicken slices'], meat: ['meat', 'beef', 'pork', 'turkey', 'ham', 'salami'], sausages: ['sausages', 'sausage'], rice: ['rice'], pasta: ['pasta', 'spaghetti', 'penne', 'fusilli'], flour: ['flour'], cereal: ['cereal'], beans: ['beans'], oil: ['oil'],
  coffee: ['coffee', 'ground coffee', 'coffee beans', 'coffee capsules'], tea: ['tea', 'black tea', 'herbal tea', 'green tea'], water: ['water'], juice: ['juice'],
  litter: ['cat litter', 'cat litter bag', 'cat litter bags', 'kitty litter', 'kitty litter bag', 'cat sand', 'litter'], dryFood: ['dry food', 'dry cat food', 'cat dry food', 'dry pet food', 'cat food', 'pet food'], wetFood: ['wet food', 'wet cat food', 'cat wet food', 'wet pet food'], treats: ['treats', 'pet treats', 'cat treats', 'cat treat'], toy: ['toys', 'toy', 'pet toy', 'pet toys'], grooming: ['grooming supplies', 'pet care products'],
  dishSoap: ['dish soap', 'dishwashing'], dishwasherTabs: ['dishwasher tabs'], rinse: ['rinse aid'], detergent: ['laundry', 'laundry detergent', 'color detergent', 'universal detergent'], softener: ['fabric softener'], cleaner: ['cleaners', 'all purpose cleaner', 'bathroom cleaner', 'glass cleaner', 'cleaning spray'], sponge: ['sponges', 'sponge'], trash: ['trash bags', 'trash bag'],
  toiletPaper: ['toilet paper'], paperTowels: ['paper towels'], soap: ['hand soap'], shampoo: ['shampoo'], conditioner: ['conditioner'], showerGel: ['shower gel', 'hair and body', 'hair body'], toothpaste: ['toothpaste', 'dental care'], toothbrush: ['toothbrushes', 'toothbrush'], floss: ['dental floss'], deodorant: ['deodorant'], battery: ['batteries', 'aa batteries', 'aaa batteries'],
  diapers: ['diapers', 'diaper'], wipes: ['wipes', 'baby wipes'], babyFood: ['baby food', 'fruit puree', 'vegetable puree', 'baby cereal'], clothes: ['clothes', 'baby clothes'], care: ['hygiene products', 'care products'],
};
const products = new Map(Object.entries(productGroups).flatMap(([kind, names]) => names.map(name => [name, kind] as const)));
const normalize = (name: string) => name.toLocaleLowerCase('en').normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
export function productIllustrationKind(name: string, id?: string): string {
  const value = normalize(id?.startsWith('catalog:') ? id.slice(8) : name);
  const direct = products.get(value);
  if (direct) return direct;
  const withoutSize = value.replace(/\s+\d+(?:\s+\d+)?\s*(?:kg|g|l|ml|oz|lb|pack|packs|pieces|pcs)$/, '').trim();
  return products.get(withoutSize) ?? 'unknown';
}

export function petFoodIllustrationName(name: string, typeOrNotes: string | null | undefined): string {
  if (productIllustrationKind(name) !== 'unknown') return name;
  const value = typeOrNotes ?? '';
  const type = value.match(/(?:^| · )Type:\s*([^·]+)/i)?.[1] ?? value;
  const normalizedType = normalize(type);
  if (normalizedType === 'dry' || normalizedType === 'dry food') return 'dry food';
  if (normalizedType === 'wet' || normalizedType === 'wet food') return 'wet food';
  if (normalizedType === 'treats') return 'treats';
  return name;
}

export function ProductIllustration({ name, id }: { name: string; id?: string }) {
  const kind = productIllustrationKind(name, id);
  let shape;
  switch (kind) {
    case 'carrot': shape = <><path d="M10 11c3-2 9-2 12 0L16 28c-1 1-2 0-3-2Z" fill="#ef9c62"/><path d="m16 11-3-7m3 7 3-8m-3 8 7-5" stroke="#8fbd92" strokeWidth="2"/><path d="m12 16 4 1m-3 3 3 1" stroke="#d17e50"/></>; break;
    case 'tomato': shape = <><circle cx="16" cy="18" r="10" fill="#e88c80"/><path d="m16 8-4-3 1 5-4 1 5 1 2-3 2 3 5-1-4-1 1-5Z" fill="#8db88d"/></>; break;
    case 'cucumber': shape = <><path d="M8 23c-3-3 0-10 7-15 5-3 8-3 10 0 3 4-1 11-7 15-4 3-8 3-10 0Z" fill="#83b58a"/><path d="m13 13 1 1m3-4 1 1m1 5 1 1m-7 2 1 1" stroke="#d4e8bd" strokeWidth="2" strokeLinecap="round"/></>; break;
    case 'potato': shape = <><path d="M6 14c1-6 7-9 13-8 7 1 9 6 7 12-1 5-5 8-11 8-7 0-11-5-9-12Z" fill="#d5ad82"/><circle cx="12" cy="12" r="1" fill="#a5795e"/><circle cx="20" cy="17" r="1" fill="#a5795e"/><circle cx="13" cy="21" r="1" fill="#a5795e"/></>; break;
    case 'onion': shape = <><path d="M16 7c-1-3 1-5 3-5-1 2-1 3-1 5 7 3 10 7 9 12-1 5-5 8-11 8S6 24 5 19c-1-5 3-9 11-12Z" fill="#d2aec0"/><path d="M16 9c-4 5-5 11-1 16m3-16c4 5 5 11 1 16" stroke="#b88aa5" fill="none"/></>; break;
    case 'pepper': shape = <><path d="M16 10c-3-3-8-3-10 1-2 4-1 13 3 15 2 1 5 0 7-1 2 1 5 2 7 1 4-2 5-11 3-15-2-4-7-4-10-1Z" fill="#eca36e"/><path d="M16 10V6c0-2 2-3 4-3" fill="none" stroke="#7da67e" strokeWidth="2"/></>; break;
    case 'lettuce': shape = <><path d="M16 26C8 27 4 21 6 16c-3-4 0-9 5-8 2-5 8-4 10 0 5-1 8 4 5 8 2 5-2 11-10 10Z" fill="#acd2a0"/><path d="M16 25V12m0 9-6-5m6 4 6-5" stroke="#749f79" strokeWidth="1.5" fill="none"/></>; break;
    case 'apple': shape = <><path d="M16 11C13 7 6 8 6 15c0 5 4 11 7 11 1 0 2-.6 3-.6s2 .6 3 .6c3 0 7-6 7-11 0-7-7-8-10-4Z" fill="#e99491"/><path d="M16 10c0-4 3-6 7-5-1 4-4 5-7 5Z" fill="#8db889"/><path d="M16 10V6" stroke="#a87d62" strokeWidth="2"/></>; break;
    case 'banana': shape = <><path d="M5 10c2 10 12 14 21 6-2 8-11 13-18 8-4-3-5-8-3-14Z" fill="#efd37d"/><path d="m5 10 2-3m19 9 2-2" stroke="#a98c5a" strokeWidth="2"/></>; break;
    case 'orange': shape = <><circle cx="16" cy="17" r="10" fill="#efa96d"/><circle cx="12" cy="14" r=".7" fill="#d88750"/><circle cx="19" cy="19" r=".7" fill="#d88750"/><path d="M16 7c1-3 4-4 7-3-1 3-4 5-7 4" fill="#8cb58c"/></>; break;
    case 'berries': shape = <><circle cx="11" cy="19" r="6" fill="#a490c2"/><circle cx="20" cy="19" r="6" fill="#8c85ba"/><circle cx="16" cy="12" r="6" fill="#c288a4"/><path d="m14 7 2 2 2-2m-8 8 1 2 2-1m6-1 1 2 2-1" stroke="#d8d3e8" fill="none"/></>; break;
    case 'grapes': shape = <><path d="M16 7c1-3 4-4 7-3-1 3-3 4-7 4" fill="#95bd8d"/><g fill="#aa95c9"><circle cx="11" cy="12" r="4"/><circle cx="19" cy="12" r="4"/><circle cx="8" cy="19" r="4"/><circle cx="16" cy="19" r="4"/><circle cx="23" cy="19" r="4"/><circle cx="12" cy="25" r="4"/><circle cx="20" cy="25" r="4"/></g></>; break;
    case 'vegetables': case 'fruit': shape = <><circle cx="12" cy="19" r="7" fill="#e6a394"/><circle cx="21" cy="19" r="7" fill="#dcb779"/><path d="m10 12 2-5 3 4m4 1 4-5" stroke="#87b28b" strokeWidth="2" fill="none"/></>; break;
    case 'egg': shape = <><path d="M16 4c-4 0-8 8-8 13a8 8 0 0 0 16 0c0-5-4-13-8-13Z" fill="#f4e7d0"/><path d="M12 19c.3 2 1.6 3 3 3" stroke="#d6ba91" fill="none"/></>; break;
    case 'milk': case 'cream': shape = <><path d="M9 8l4-5h9l-4 5 4 3v16H7V11Z" fill="#f4e9df"/><path d="M18 8v19h6V11Z" fill="#aac4d9"/><path d="M10 15h7v6h-7Z" fill="#a7d3bf"/></>; break;
    case 'bread': case 'rolls': case 'croissant': case 'bagel': shape = kind === 'bagel' ? <><circle cx="16" cy="16" r="11" fill="#deb07b"/><circle cx="16" cy="16" r="4" fill="#776655"/></> : kind === 'croissant' ? <path d="M5 10c1 8 7 14 11 14s10-6 11-14c-3 4-6 5-11 5s-8-1-11-5Z" fill="#e5b67d"/> : <><path d="M7 14C2 7 8 4 12 6c2-4 9-3 10 1 6-1 7 7 3 9v9H7Z" fill="#dfad76"/><path d="M9 17h14v7H9Z" fill="#f5d2a0"/><path d="M12 10l2 3m4-4 2 3" stroke="#a8714d"/></>; break;
    case 'cheese': shape = <><path d="M4 16 26 7v18H4Z" fill="#efcc79"/><circle cx="13" cy="18" r="2" fill="#d9aa54"/><circle cx="21" cy="14" r="1.5" fill="#d9aa54"/></>; break;
    case 'chicken': shape = <><path d="M8 18c-1-7 5-12 12-10 5 1 6 6 3 9-3 4-7 2-9 5l-2 2-4-3 2-2Z" fill="#e3a093"/><path d="m9 21-3 3m1-1-2-1m1 2-1 2" stroke="#f2e6d7" strokeWidth="2"/></>; break;
    case 'meat': case 'sausages': shape = <><path d="M5 15c1-7 8-10 15-8 7 2 9 8 5 13-4 6-12 7-17 3-3-2-4-5-3-8Z" fill="#c78380"/><path d="M10 15c2-3 7-4 10-2 3 2 1 5-2 5" fill="none" stroke="#f2c9b7" strokeWidth="2"/></>; break;
    case 'litter': shape = <><path d="M7 5h18l-1 5 2 17H6L8 10Z" fill="#a6c5c1"/><path d="M10 16v-4l3 2 3-1 3 1 3-2v4c0 4-3 6-6 6s-6-2-6-6Z" fill="#f4e9dd"/><circle cx="13" cy="17" r=".8" fill="#617d77"/><circle cx="19" cy="17" r=".8" fill="#617d77"/><path d="M11 24h1m3 0h1m3 0h1" stroke="#607d76" strokeWidth="2"/></>; break;
    case 'dryFood': case 'wetFood': shape = <><path d="M8 5h16l-1 5 2 17H7l2-17Z" fill={kind === 'wetFood' ? '#b6b5d5' : '#c6aece'}/><circle cx="16" cy="19" r="2.3" fill="#f7e8da"/><circle cx="12" cy="16" r="1.4" fill="#f7e8da"/><circle cx="20" cy="16" r="1.4" fill="#f7e8da"/><circle cx="16" cy="14" r="1.4" fill="#f7e8da"/></>; break;
    case 'treats': shape = <><path d="M5 16c4-6 10-7 15-4l5-3v14l-5-3c-5 3-11 2-15-4Z" fill="#e8bd91"/><circle cx="10" cy="15" r="1" fill="#927465"/><path d="M14 14v4m3-5v6" stroke="#c89772"/></>; break;
    case 'coffee': case 'tea': shape = <><path d="M7 10h16v9c0 4-3 7-8 7s-8-3-8-7Z" fill={kind === 'coffee' ? '#d7b39f' : '#a9c7ab'}/><path d="M23 12h2a3 3 0 0 1 0 6h-2M12 7c-2-2 2-2 0-4m6 4c-2-2 2-2 0-4" stroke="#e9d8ce" strokeWidth="1.5" fill="none"/></>; break;
    case 'cleaner': case 'dishSoap': case 'rinse': shape = <><path d="M12 7h9v4h-3l-1 2h5l2 4v10H8V17l4-4Z" fill="#a9c9db"/><path d="M14 5h8l3 3h-6" fill="none" stroke="#eee7e1" strokeWidth="2"/><path d="M11 20h10v4H11Z" fill="#f7f1e9"/></>; break;
    case 'toothpaste': shape = <><path d="M8 7h13l-2 17H10Z" fill="#f1ece7"/><path d="M10 14h10v5H10Z" fill="#aacdc8"/><path d="M11 5h7v2h-7Z" fill="#d0c4bc"/></>; break;
    case 'toothbrush': shape = <><path d="M9 5h5v9l11 10-3 3L11 16H9Z" fill="#a9cbd1"/><path d="M9 5h6v7H9Z" fill="#f2e9e2"/><path d="M10 6v5m2-5v5m2-5v5" stroke="#a7bfc6"/></>; break;
    case 'floss': shape = <><rect x="8" y="6" width="16" height="21" rx="5" fill="#d8c9d8"/><path d="M10 10h12m-7 5c4-3 7 2 3 5-2 2-5 1-5 4" fill="none" stroke="#f6f0eb" strokeWidth="2"/></>; break;
    case 'toy': shape = <><circle cx="16" cy="16" r="10" fill="#e5b89e"/><path d="M7 14c5 0 9 5 10 11m-4-18c1 5 6 9 12 9" stroke="#f7e8d8" strokeWidth="2" fill="none"/></>; break;
    case 'diapers': shape = <><path d="M5 8h22l-3 17H8Z" fill="#f3e6e1"/><path d="M5 11c5 1 6 4 6 7h10c0-3 1-6 6-7" fill="none" stroke="#d3aebc" strokeWidth="2"/><path d="M12 21h8" stroke="#d3aebc"/></>; break;
    case 'wipes': shape = <><rect x="5" y="10" width="22" height="14" rx="4" fill="#bacdd9"/><path d="M11 10c2-5 5-5 6-1 2-4 4-3 5 1" fill="#f5f0ea"/><path d="M8 19h16" stroke="#f5f0ea" strokeWidth="2"/></>; break;
    case 'toiletPaper': case 'paperTowels': shape = <><rect x="7" y="7" width="18" height="19" rx="5" fill="#eee7dd"/><ellipse cx="16" cy="8" rx="9" ry="4" fill="#faf6ee"/><ellipse cx="16" cy="8" rx="3" ry="1.5" fill="#c3b4a6"/><path d="M7 20c3 2 7 2 10 0v6" fill="none" stroke="#d2c8bb"/></>; break;
    case 'clothes': shape = <><path d="m10 5 6 2 6-2 5 5-4 4-2-2v14H11V12l-2 2-4-4Z" fill="#e7c1c6"/><path d="M13 6c0 3 6 3 6 0" fill="none" stroke="#f8ece5"/></>; break;
    case 'battery': shape = <><rect x="7" y="8" width="7" height="18" rx="2" fill="#d6bb8c"/><rect x="18" y="8" width="7" height="18" rx="2" fill="#b2c4d7"/><path d="M9 5h3v3H9zm11 0h3v3h-3z" fill="#f1e7d9"/></>; break;
    case 'yogurt': case 'creamCheese': shape = <><path d="M8 9h16l-2 17H10Z" fill="#e4bdcf"/><path d="M7 7h18v3H7Z" fill="#f5eee7"/><path d="M12 15h8v6h-8Z" fill="#f7f0e6"/><circle cx="16" cy="18" r="2" fill="#b592ac"/></>; break;
    case 'butter': shape = <><rect x="5" y="12" width="22" height="13" rx="3" fill="#e8cd86"/><path d="M7 11h18l-3-4H10Z" fill="#f3e2ad"/><path d="M10 17h12" stroke="#c7a866" strokeWidth="2"/></>; break;
    case 'rice': case 'flour': shape = <><path d="M8 5h16l-1 5 2 17H7l2-17Z" fill={kind === 'rice' ? '#d8c7a1' : '#d5c4b4'}/><rect x="10" y="13" width="12" height="9" rx="2" fill="#f5ede0"/><path d="m13 17 2-2m2 4 2-2m-6 3 2-2" stroke="#b49e7d"/></>; break;
    case 'pasta': shape = <><path d="M5 17h22c-1 7-5 10-11 10S6 24 5 17Z" fill="#c5b5cf"/><path d="M10 15c-2-4 4-5 3-9m3 9c-2-4 4-5 3-9m3 9c-2-4 3-4 2-7" fill="none" stroke="#e9c788" strokeWidth="2" strokeLinecap="round"/></>; break;
    case 'cereal': shape = <><path d="M8 5h16v22H8Z" fill="#dfb98f"/><rect x="10" y="11" width="12" height="11" rx="2" fill="#f5e7d5"/><path d="M12 16h8c-1 4-7 4-8 0Z" fill="#b88c74"/></>; break;
    case 'beans': shape = <><rect x="8" y="7" width="16" height="20" rx="3" fill="#b5c3b8"/><path d="M8 10h16m-16 14h16" stroke="#e4e1d8" strokeWidth="2"/><path d="M13 15c-3 0-3 5 0 5 3 0 3-5 0-5Zm6 0c-3 0-3 5 0 5 3 0 3-5 0-5Z" fill="#c48f7f"/></>; break;
    case 'oil': case 'water': case 'juice': shape = <><path d="M12 4h8v4l3 4v15H9V12l3-4Z" fill={kind === 'water' ? '#a8cbdc' : kind === 'juice' ? '#e8b08a' : '#d9c483'}/><path d="M11 15h10v7H11Z" fill="#f7efe4"/><path d="M13 3h6v3h-6Z" fill="#e9e4db"/></>; break;
    case 'dishwasherTabs': shape = <><rect x="5" y="9" width="22" height="16" rx="4" fill="#b7cbd8"/><rect x="8" y="12" width="7" height="9" rx="2" fill="#f3eee6"/><rect x="17" y="12" width="7" height="9" rx="2" fill="#e7d0b8"/></>; break;
    case 'detergent': case 'softener': shape = <><path d="M12 5h8v3l4 3v16H7V12l5-4Z" fill={kind === 'detergent' ? '#a9bad9' : '#c6b4d5'}/><path d="M19 10h3v5h-3Z" fill="#f2eae4"/><rect x="10" y="17" width="10" height="6" rx="2" fill="#f5eee7"/></>; break;
    case 'sponge': shape = <><rect x="5" y="10" width="22" height="14" rx="3" fill="#e9d594"/><path d="M5 13h22" stroke="#8eb693" strokeWidth="4"/><circle cx="11" cy="18" r="1" fill="#c5ae70"/><circle cx="20" cy="20" r="1" fill="#c5ae70"/></>; break;
    case 'trash': shape = <><path d="M11 5h10l-1 4c5 3 7 8 5 17H7C5 17 7 12 12 9Z" fill="#aeb8b7"/><path d="M11 8h10m-4-2v4" stroke="#e1e5dc" strokeWidth="2"/></>; break;
    case 'soap': shape = <><rect x="5" y="13" width="22" height="12" rx="5" fill="#dfc2cd"/><path d="M9 16h14" stroke="#f4e7ed" strokeWidth="2"/><circle cx="21" cy="8" r="3" fill="#c3d7d7"/></>; break;
    case 'shampoo': case 'conditioner': case 'showerGel': case 'deodorant': shape = <><path d="M10 8h12l2 3v16H8V11Z" fill={kind === 'shampoo' ? '#b9c3d8' : kind === 'conditioner' ? '#d8b6cc' : kind === 'showerGel' ? '#b7d4c7' : '#d3c0ca'}/><path d="M12 4h8v4h-8Z" fill="#e9e0db"/><path d="M10 15h12v7H10Z" fill="#f4eae5"/></>; break;
    case 'babyFood': shape = <><rect x="8" y="9" width="16" height="17" rx="4" fill="#e8c59f"/><path d="M8 7h16v4H8Z" fill="#e7e2d6"/><circle cx="16" cy="18" r="4" fill="#f5e6d5"/><path d="M15 17c1-2 3-2 3-2" stroke="#91b28c" fill="none"/></>; break;
    case 'grooming': shape = <><rect x="8" y="7" width="16" height="13" rx="5" fill="#c4a3bb"/><path d="M16 20v7M10 10v7m4-7v7m4-7v7m4-7v7" stroke="#f1e4e9" strokeWidth="2"/></>; break;
    case 'care': shape = <><rect x="6" y="10" width="20" height="15" rx="3" fill="#bdd1cb"/><path d="M12 10V7h8v3m-4 3v8m-4-4h8" stroke="#f7eee7" strokeWidth="2" fill="none"/></>; break;
    case 'unknown': shape = <><path d="M7 10h18l2 16H5Z" fill="#b6a8c1"/><path d="M11 10V8a5 5 0 0 1 10 0v2" stroke="#eee7f1" strokeWidth="2" fill="none"/></>; break;
    default: {
      const color: Record<string, string> = { yogurt: '#d7b4c9', butter: '#e6cf90', rice: '#e2d2af', pasta: '#e9bf82', flour: '#d9c9bb', cereal: '#dcb58c', beans: '#cfa69a', oil: '#d5c47e', water: '#a8cbdc', juice: '#e8b08a', dishwasherTabs: '#a8bcd6', detergent: '#a9bad9', softener: '#c6b4d5', sponge: '#e9d594', trash: '#9fa8a9', soap: '#ddc2ca', shampoo: '#b9c3d8', conditioner: '#d8b6cc', showerGel: '#b7d4c7', deodorant: '#d3c0ca', babyFood: '#e7c6a3', care: '#b7ccd2', grooming: '#aac8bc' };
      shape = <><rect x="8" y="7" width="16" height="20" rx="3" fill={color[kind] ?? '#b6c9c1'}/><path d="M12 4h8v3h-8Z" fill="#eee4d9"/><rect x="10" y="13" width="12" height="9" rx="2" fill="#f8f3ec" opacity=".9"/><text x="16" y="20" textAnchor="middle" fontSize="5" fontWeight="700" fill="#665664">{name.slice(0, 2).toUpperCase()}</text></>;
    }
  }
  return <svg className="product-illustration" data-illustration={kind} viewBox="0 0 32 32" aria-hidden="true" focusable="false">{shape}</svg>;
}
