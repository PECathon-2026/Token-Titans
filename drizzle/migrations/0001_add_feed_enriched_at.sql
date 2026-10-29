ALTER TABLE public.discovery_feeds ADD COLUMN IF NOT EXISTS enriched_at timestamptz;
GRANT ALL ON public.discovery_feeds TO service_role;