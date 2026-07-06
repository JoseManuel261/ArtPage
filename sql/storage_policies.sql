-- ============================================================
-- Politicas de Storage para el bucket "imagenes_stickers"
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- Sin esto, marcar el bucket como "Public" solo permite LEER
-- las imagenes; subirlas (insert) sigue bloqueado por RLS.
-- ============================================================

create policy "imagenes_stickers_select_publico"
on storage.objects for select
to public
using ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_insert_publico"
on storage.objects for insert
to public
with check ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_update_publico"
on storage.objects for update
to public
using ( bucket_id = 'imagenes_stickers' );

create policy "imagenes_stickers_delete_publico"
on storage.objects for delete
to public
using ( bucket_id = 'imagenes_stickers' );
