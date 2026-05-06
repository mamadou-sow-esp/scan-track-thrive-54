
-- Fix search_path on set_updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Revoke EXECUTE on SECURITY DEFINER functions from public/auth roles (triggers still work)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Restrict bucket listing: only allow reading specific objects, not listing
DROP POLICY "meal photos public read" ON storage.objects;
CREATE POLICY "meal photos public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'meals' AND auth.role() = 'authenticated' OR bucket_id = 'meals' AND (storage.foldername(name))[1] IS NOT NULL);
