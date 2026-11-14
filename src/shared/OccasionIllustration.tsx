import { ProductIllustration } from './ProductIllustration';

/** Small local illustrations for the occasion suggestions that are not catalog products. */
export default function OccasionIllustration({ name }: { name: string }) {
  let picture;
  switch (name) {
    case 'Snacks': picture = <><path d="M9 5h14l-1 5 2 17H8l2-17Z" fill="#f0b77e"/><path d="M11 14h10v8H11Z" fill="#f9dfb3"/><path d="m13 17 2 2 3-3" fill="none" stroke="#c78362" strokeWidth="1.5"/></>; break;
    case 'Dips': picture = <><path d="M4 17h24c-1 7-5 10-12 10S5 24 4 17Z" fill="#cab1d7"/><ellipse cx="16" cy="17" rx="12" ry="3" fill="#f0d4a1"/><path d="M13 15c2-2 5-2 7 0" fill="none" stroke="#89ae84" strokeWidth="2"/></>; break;
    case 'Soft drinks': case 'Drinks': picture = <><path d="M12 4h8v4l3 4v15H9V12l3-4Z" fill="#b6c9e1"/><path d="M10 15h12v7H10Z" fill="#f2b5bb"/><path d="M13 4h6" stroke="#f8eee9" strokeWidth="3"/></>; break;
    case 'Ice': picture = <><path d="m4 17 9-4 7 4-9 5Z" fill="#c6e5ed"/><path d="m4 17 7 5v7l-7-5Zm7 5 9-5v7l-9 5Z" fill="#96c9d8"/><path d="m15 8 8-4 6 4-8 4Z" fill="#d6edf1"/><path d="m15 8 6 4v7l-6-4Zm6 4 8-4v7l-8 4Z" fill="#a9d6e0"/></>; break;
    case 'Party supplies': picture = <><path d="m9 6 5 2-2 17H7ZM18 8l6-2 2 19h-6Z" fill="#e3a1b9"/><path d="M6 10h9m2 1h9" stroke="#f7dfc9" strokeWidth="2"/><path d="m11 5-2-3m12 4 2-4" stroke="#bda5dc" strokeWidth="1.5"/></>; break;
    case 'Popcorn': picture = <><path d="M8 12h16l-2 15H10Z" fill="#e28b8f"/><path d="M12 12v14m7-14v14" stroke="#f7e5d3" strokeWidth="3"/><circle cx="10" cy="10" r="4" fill="#f6e8c7"/><circle cx="17" cy="8" r="5" fill="#f6e8c7"/><circle cx="23" cy="11" r="4" fill="#f6e8c7"/></>; break;
    case 'Sweets': picture = <><path d="m5 12 5 2v5l-5 2-3-4Zm22 0-5 2v5l5 2 3-4Z" fill="#e8aac2"/><rect x="9" y="11" width="14" height="12" rx="5" fill="#c2a6dc"/><path d="m12 20 7-7" stroke="#f7e7ed" strokeWidth="2"/></>; break;
    default: return <ProductIllustration name={name} />;
  }
  return <svg className="product-illustration" viewBox="0 0 32 32" aria-hidden="true" focusable="false">{picture}</svg>;
}
