import { catalog, type CatalogItem } from './shoppingCatalog';
import type { ShoppingItem } from './useSharedShopping';

type Group = { title: string; items: string[]; category: ShoppingItem['category'] };
const home = (title: string, items: string[]): Group => ({ title, items, category: 'Home' });
const food = catalog.Home[0].items;
const subgroup = (title: string) => {
  const item = food.find(entry => typeof entry !== 'string' && entry.title === title);
  return item && typeof item !== 'string' ? item.items : [];
};
const flatten = (items: CatalogItem[]) => items.flatMap(item => typeof item === 'string' ? [item] : item.items);
const drinks = ['Cola', 'Cola Zero', 'Sprite', 'Fanta', 'Juice', 'Energy Drink', 'Iced Tea', 'Lemonade', 'Water'];
const snacks = ['Potato Chips', 'Tortilla Chips', 'Nuts', 'Popcorn', 'Pretzels', 'Crackers', 'Nachos'];
const bakery = subgroup('Bread');
const dairy = ['Milk', 'Yogurt', 'Butter', ...subgroup('Cheese')];
const vegetables = subgroup('Vegetables');
const fruit = subgroup('Fruit');
const meat = subgroup('Meat');
const coffeeTea = ['Ground coffee', 'Coffee beans', 'Coffee capsules', 'Black tea', 'Herbal tea', 'Green tea'];
export const occasionCatalog: Record<string, Group[]> = {
  party: [home('Soft Drinks', drinks), home('Snacks', snacks), home('Dips', ['Salsa', 'Guacamole', 'Hummus', 'Cheese Dip']), home('Party Supplies', ['Ice', 'Cups', 'Plates', 'Napkins', 'Decorations'])],
  daily: [home('Bakery', bakery), home('Dairy', dairy), home('Meat & Alternatives', [...meat, 'Beans']), home('Vegetables', vegetables), home('Fruit', fruit), home('Pantry Essentials', ['Eggs', 'Rice', ...subgroup('Pasta'), 'Flour', 'Cereal', 'Oil', 'Toilet paper']), home('Drinks', ['Water', 'Juice', ...coffeeTea])],
  movie: [home('Popcorn', ['Popcorn']), home('Snacks', snacks.filter(name => name !== 'Popcorn')), home('Sweets', ['Sweets', 'Chocolate', 'Cookies']), home('Soft Drinks', drinks)],
  weekend: [home('Bakery', bakery), home('Breakfast', ['Eggs', 'Milk', 'Yogurt', 'Cereal', 'Butter']), home('Coffee & Tea', coffeeTea), home('Sweet Treats', ['Sweets', 'Chocolate', 'Cookies'])],
};
export const customCollectionCatalog: Group[] = (['Home', 'Pets', 'Kids'] as const).flatMap(category => catalog[category].map(group => ({ title: `${category} · ${group.title}`, items: flatten(group.items), category })));
