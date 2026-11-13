/* Small local illustrations for the catalog; uploaded favorite photos remain untouched. */
export function ProductIllustration({ name }: { name: string }) {
  const n = name.toLowerCase();
  const hash = [...n].reduce((value, letter) => (value * 31 + letter.charCodeAt(0)) >>> 0, 0);
  const palettes = ['#f2b697', '#9ec8bd', '#b8cde5', '#ead19a', '#d7b1c7', '#b6caa2'];
  const fill = palettes[hash % palettes.length];
  let shape;
  if (/egg/.test(n)) shape = <><path d="M16 4c-4 0-8 8-8 13a8 8 0 0 0 16 0c0-5-4-13-8-13Z" fill="#f7e8cc"/><path d="M12 19c.3 2 1.6 3 3 3" stroke="#d6ba91" fill="none"/></>;
  else if (/bread|toast|roll|bagel|croissant/.test(n)) shape = <><path d="M7 14C2 7 8 4 12 6c2-4 9-3 10 1 6-1 7 7 3 9v9H7Z" fill="#dfad76"/><path d="M9 17h14v7H9Z" fill="#f5d2a0"/><path d="M12 10l2 3m4-4 2 3" stroke="#a8714d"/></>;
  else if (/coffee|tea|juice|water/.test(n)) shape = <><path d="M7 10h16v9c0 4-3 7-8 7s-8-3-8-7Z" fill={fill}/><path d="M23 12h2a3 3 0 0 1 0 6h-2M12 7c-2-2 2-2 0-4m6 4c-2-2 2-2 0-4" stroke="#e9d8ce" strokeWidth="1.5" fill="none"/></>;
  else if (/cheese|gouda|emmental|mozzarella|parmesan/.test(n)) shape = <><path d="M4 16 26 7v18H4Z" fill="#efcc79"/><circle cx="13" cy="18" r="2" fill="#d9aa54"/><circle cx="21" cy="14" r="1.5" fill="#d9aa54"/></>;
  else if (/apple|tomato|pepper|orange|fruit|berries|grape|banana|cucumber|carrot|potato|onion|salad|vegetable/.test(n)) shape = <><path d="M16 11c-3-5-11-3-11 4 0 5 4 11 8 11 1 0 2-.6 3-.6s2 .6 3 .6c4 0 8-6 8-11 0-7-8-9-11-4Z" fill={fill}/><path d="M16 10c0-4 3-6 7-5-1 4-3 5-7 5Z" fill="#8ab38a"/><path d="M15 10V6" stroke="#d1ad86" strokeWidth="2"/></>;
  else if (/milk|cream|juice|drink|yogurt/.test(n)) shape = <><path d="M9 8l4-5h9l-4 5 4 3v16H7V11Z" fill="#f4e9df"/><path d="M18 8v19h6V11Z" fill={fill}/><path d="M11 16h5v5h-5z" fill={fill}/></>;
  else if (/chicken|meat|beef|pork|turkey|ham|salami|sausage/.test(n)) shape = <><path d="M6 18c-1-8 6-13 13-11 5 2 6 7 3 10-3 4-7 3-9 6l-3 3-4-3 3-3Z" fill="#e3a093"/><path d="M18 10c2 0 3 2 2 4" stroke="#f8ded1" strokeWidth="2" fill="none"/></>;
  else if (/spray|cleaner|dish soap|rinse/.test(n)) shape = <><path d="M12 5h10v4h-3l-2 3h6l2 4v11H8V16l4-4Z" fill={fill}/><path d="M14 4h8l3 3h-6" fill="none" stroke="#e4e0df" strokeWidth="2"/><path d="M11 19h11v5H11Z" fill="#f5eee9" opacity=".8"/></>;
  else if (/tooth|dental/.test(n)) shape = <><path d="M8 7h13l-2 17H10Z" fill="#f1ece7"/><path d="M10 14h10v5H10Z" fill={fill}/><path d="M11 5h7v2h-7Z" fill="#d0c4bc"/></>;
  else if (/litter|food|treat|cereal|rice|pasta|flour|detergent|bag/.test(n)) shape = <><path d="M8 5h16l-1 5 2 17H7l2-17Z" fill={fill}/><path d="M11 14h10v8H11Z" fill="#f6e9db" opacity=".85"/><circle cx="16" cy="18" r="2" fill="#b68e76"/></>;
  else if (/tissue|paper|wipe|diaper/.test(n)) shape = <><rect x="5" y="10" width="22" height="14" rx="4" fill={fill}/><path d="M11 10c2-5 5-5 6-1 2-4 4-3 5 1" fill="#f5f0ea"/><path d="M8 19h16" stroke="#f5f0ea" strokeWidth="2"/></>;
  else if (/toy|play/.test(n)) shape = <><circle cx="16" cy="16" r="10" fill={fill}/><path d="M7 14c5 0 9 5 10 11m-4-18c1 5 6 9 12 9" stroke="#f7e8d8" strokeWidth="2" fill="none"/></>;
  else shape = <><rect x="8" y="8" width="16" height="19" rx="3" fill={fill}/><path d="M12 5h8v3h-8Z" fill="#f3e9dc"/><rect x="10" y="14" width="12" height="8" rx="2" fill="#f8f3ec" opacity=".88"/><text x="16" y="20" textAnchor="middle" fontSize="5" fontWeight="700" fill="#665664">{name.slice(0, 2).toUpperCase()}</text></>;
  return <svg className="product-illustration" viewBox="0 0 32 32" aria-hidden="true" focusable="false">{shape}</svg>;
}
