import type { ShoppingItem } from './useSharedShopping';
import { ProductIllustration, petFoodIllustrationName } from './ProductIllustration';

export function shoppingPhoto(item: ShoppingItem, favoritePhotos: Record<string, string | null>, petFoodPhotos: Record<string, string | null>) {
  return item.pet_food_id ? petFoodPhotos[item.pet_food_id] ?? null : item.favorite_id ? favoritePhotos[item.favorite_id] ?? null : null;
}

function field(notes: string, label: string) {
  return notes.split(' · ').find(part => part.startsWith(`${label}: `))?.slice(label.length + 2) ?? '';
}

export function shoppingDisplayName(item: ShoppingItem) {
  const brand = item.pet_food_id ? field(item.notes, 'Brand').trim() : '';
  const name = item.name.trim();
  return brand && !name.toLocaleLowerCase().startsWith(brand.toLocaleLowerCase()) ? `${brand} ${name}` : item.name;
}

export default function ShoppingItemDetail({ item, photo, onClose, onEdit, onDelete, addedBy, busy = false }: { addedBy?: string; item: ShoppingItem; photo: string | null; onClose: () => void; onEdit?: () => void; onDelete?: () => void; busy?: boolean }) {
  const brand = field(item.notes, 'Brand');
  const quantity = field(item.notes, 'Quantity') || field(item.notes, 'Quantity or size') || field(item.notes, 'Size');
  return <div className="shopping-detail-overlay" role="presentation" onMouseDown={onClose}>
    <section className="shopping-detail-card" role="dialog" aria-modal="true" aria-labelledby="shopping-detail-title" onMouseDown={event => event.stopPropagation()}>
      <div className="shopping-detail-header"><button type="button" className="text-action shopping-detail-close" onClick={onClose}>Close</button></div>
      <div className="shopping-detail-photo">{photo ? <img src={photo} alt="" /> : <ProductIllustration name={item.pet_food_id ? petFoodIllustrationName(item.name, item.notes) : item.name} />}</div>
      <h2 id="shopping-detail-title">{shoppingDisplayName(item)}</h2>
      <dl>
        {brand && <><dt>Brand</dt><dd>{brand}</dd></>}
        {quantity && <><dt>Quantity</dt><dd>{quantity}</dd></>}
        {item.notes && <><dt>Notes</dt><dd className="shopping-item-notes">{item.notes}</dd></>}
        <dt>Category</dt><dd>{item.category}</dd>
        {addedBy && <><dt>Added by</dt><dd>{addedBy}</dd></>}
      </dl>
      {(onEdit || onDelete) && <div className="shopping-detail-actions">{onEdit && <button className="primary" disabled={busy} onClick={onEdit}>Edit item</button>}{onDelete && <button className="text-action" disabled={busy || !navigator.onLine} onClick={onDelete}>Delete item</button>}</div>}
    </section>
  </div>;
}
