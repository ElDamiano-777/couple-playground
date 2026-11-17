-- Barcode lookup returns public Open Food Facts image URLs; uploaded photos remain private data URLs.
begin;
alter table public.shopping_favorites drop constraint shopping_favorites_photo_check;
alter table public.shopping_favorites add constraint shopping_favorites_photo_check check (
  photo is null or (
    length(photo) <= 1400000 and (
      photo ~ '^data:image/(jpeg|png|webp);base64,'
      or photo ~* '^https://([a-z0-9-]+\.)*openfoodfacts[.]org(:[0-9]{1,5})?/[^[:space:]]*$'
    )
  )
);
commit;
