export type SymbolName = `more` | `home` | `shopping` | `plans` | `family` | `bell` | `plus` | `arrow` | `heart` | `folder` | `recipe` | `pet` | `pin` | `wishlist`;

export function Symbol({ name }: { name: SymbolName }) {
  const paths: Record<SymbolName, string> = {
    more: `M4 12h.01M12 12h.01M20 12h.01`,
    home: `m3 10 9-7 9 7v10H15v-7H9v7H3Z`,
    shopping: `M5 7h14l2 14H3L5 7Zm3 0V6a4 4 0 0 1 8 0v1`,
    plans: `M4 5h16v16H4ZM8 2v6m8-6v6M4 11h16m-12 4h3m2 0h3`,
    family: `M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10v-3a6 6 0 0 1 12 0v3m3-17a4 4 0 0 1 0 8m1 3a5 5 0 0 1 4 5v1`,
    bell: `M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4`,
    plus: `M12 5v14M5 12h14`,
    arrow: `M4 12h16m-6-6 6 6-6 6`,
    folder: `M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2ZM3 9h18`,
    recipe: `M5 3h12a2 2 0 0 1 2 2v16H7a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3m-3 15a3 3 0 0 1 3-3h12M9 7h6m-6 4h4`,
    pet: `M8 14c-2 2-3 5-1 6 2 1 3-1 5-1s3 2 5 1c2-1 1-4-1-6s-6-2-8 0ZM5 8a2 3 0 1 0 0 .1ZM10 4a2 3 0 1 0 0 .1ZM16 4a2 3 0 1 0 0 .1ZM20 8a2 3 0 1 0 0 .1Z`,
    pin: `M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 0-6 0 3 3 0 0 0 6 0Z`,
    wishlist: `M5 3h14v18l-7-4-7 4ZM9 9l2 2 4-4`,
    heart: `M20 5a5 5 0 0 0-8 1 5 5 0 0 0-8-1c-5 5 3 11 8 15 5-4 13-10 8-15Z`,
  };
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}

