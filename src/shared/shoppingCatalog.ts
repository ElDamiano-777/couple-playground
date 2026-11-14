import type { ShoppingItem } from './useSharedShopping';

export type CatalogItem = string | { title: string; items: string[] };
export type CatalogGroup = { title: string; items: CatalogItem[] };
export const catalog: Record<ShoppingItem['category'], CatalogGroup[]> = {
  Home: [
    { title: 'Food', items: ['Eggs', 'Milk', { title: 'Bread', items: ['Toast bread', 'Rolls', 'Bagels', 'Croissants'] }, { title: 'Meat', items: ['Chicken', 'Beef', 'Pork', 'Turkey', 'Sausages', 'Chicken slices', 'Ham', 'Salami'] }, { title: 'Vegetables', items: ['Carrots', 'Tomatoes', 'Cucumbers', 'Potatoes', 'Onions', 'Peppers', 'Salad'] }, { title: 'Fruit', items: ['Apples', 'Bananas', 'Oranges', 'Berries', 'Grapes'] }, { title: 'Cheese', items: ['Gouda', 'Emmental', 'Mozzarella', 'Cream cheese', 'Parmesan', 'Sandwich cheese', 'Cottage cheese'] }, 'Rice', { title: 'Pasta', items: ['Spaghetti', 'Penne', 'Fusilli'] }, 'Yogurt', 'Butter', 'Cream', 'Spread', 'Flour', 'Cereal', 'Oil', 'Beans', 'Water', 'Juice'] },
    { title: 'Cleaning', items: [{ title: 'Dishwashing', items: ['Dish soap', 'Dishwasher tabs', 'Rinse aid'] }, { title: 'Laundry', items: ['Laundry detergent', 'Color detergent', 'Universal detergent', 'Fabric softener'] }, { title: 'Cleaners', items: ['All-purpose cleaner', 'Bathroom cleaner', 'Glass cleaner'] }, 'Sponges', 'Trash bags'] },
    { title: 'Bathroom & care', items: ['Toilet paper', 'Hand soap', { title: 'Hair & body', items: ['Shampoo', 'Conditioner', 'Shower gel'] }, { title: 'Dental care', items: ['Toothpaste', 'Toothbrushes', 'Dental floss'] }, 'Deodorant'] },
    { title: 'Everyday essentials', items: ['Paper towels', { title: 'Batteries', items: ['AA batteries', 'AAA batteries'] }, { title: 'Coffee', items: ['Ground coffee', 'Coffee beans', 'Coffee capsules'] }, { title: 'Tea', items: ['Black tea', 'Herbal tea', 'Green tea'] }] },
  ],
  Pets: [
    { title: 'Food & treats', items: ['Dry food', 'Wet food', 'Treats'] },
    { title: 'Care & supplies', items: ['Cat litter', 'Toys', 'Grooming supplies', 'Pet care products'] },
  ],
  Kids: [
    { title: 'Essentials', items: ['Diapers', 'Wipes', { title: 'Baby food', items: ['Fruit puree', 'Vegetable puree', 'Baby cereal'] }, 'Clothes'] },
    { title: 'Play & care', items: ['Toys', 'Shampoo', 'Hygiene products', 'Care products'] },
  ],
};
