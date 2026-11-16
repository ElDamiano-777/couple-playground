export type ItemDetails = { quantity: string; unit: string; customUnit: string; store: string; price: string; notes: string };
export const emptyItemDetails = (): ItemDetails => ({ quantity: '1', unit: '', customUnit: '', store: '', price: '', notes: '' });
const units = ['pieces', 'bottles', 'packs', 'kg', 'g', 'L', 'ml'];

export function formatItemDetails(details: ItemDetails) {
  const unit = details.unit === 'custom' ? details.customUnit.trim() : details.unit;
  const price = details.price.trim().replace(',', '.');
  return [`Quantity: ${details.quantity.trim() || '1'}${unit ? ` ${unit}` : ''}`, details.store.trim() && `Store: ${details.store.trim()}`, price && `Price per unit: €${Number(price).toFixed(2)}`, details.notes.trim() && `Notes: ${details.notes.trim()}`].filter(Boolean).join('\n');
}
export function validItemDetails(details: ItemDetails) {
  return (!details.quantity || (/^\d+(?:[.,]\d+)?$/.test(details.quantity) && Number(details.quantity.replace(',', '.')) > 0)) && (!details.price || (/^\d+(?:[.,]\d{1,2})?$/.test(details.price) && Number.isFinite(Number(details.price.replace(',', '.'))))) && (details.unit !== 'custom' || !!details.customUnit.trim());
}
export function parseItemDetails(value: string): ItemDetails | null {
  const match = /^Quantity: (\d+(?:[.,]\d+)?)(?: ([^\n]+))?(?:\nStore: ([^\n]+))?(?:\nPrice per unit: €(\d+(?:\.\d{2})?))?(?:\nNotes: ([\s\S]*))?$/.exec(value);
  if (!match) return null;
  const unit = match[2] || '';
  return { quantity: match[1], unit: unit && !units.includes(unit) ? 'custom' : unit, customUnit: unit && !units.includes(unit) ? unit : '', store: match[3] || '', price: match[4] || '', notes: match[5] || '' };
}
export function ItemDetailFields({ value, onChange }: { value: ItemDetails; onChange: (next: ItemDetails) => void }) {
  const set = (key: keyof ItemDetails, next: string) => onChange({ ...value, [key]: next });
  return <div className="collection-detail-fields">
    <label>Quantity<input inputMode="decimal" maxLength={20} value={value.quantity} onChange={event => set('quantity', event.target.value)} /></label>
    <label>Unit<select value={value.unit} onChange={event => set('unit', event.target.value)}><option value="">None</option>{units.map(unit => <option key={unit} value={unit}>{unit}</option>)}<option value="custom">Custom</option></select></label>
    {value.unit === 'custom' && <label>Custom unit<input value={value.customUnit} maxLength={80} onChange={event => set('customUnit', event.target.value)} /></label>}
    <label>Store<input value={value.store} maxLength={200} onChange={event => set('store', event.target.value)} /></label>
    <label>Price per unit (€)<input inputMode="decimal" maxLength={12} value={value.price} onChange={event => set('price', event.target.value)} /></label>
    <label className="collection-notes-field">Notes<textarea rows={2} maxLength={18000} value={value.notes} onChange={event => set('notes', event.target.value)} /></label>
    {!validItemDetails(value) && <p role="alert">Enter a positive quantity, a valid price, and a custom unit if selected.</p>}
  </div>;
}
