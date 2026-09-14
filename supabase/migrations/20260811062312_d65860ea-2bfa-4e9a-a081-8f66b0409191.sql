CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_email_key ON public.profiles (lower(email));
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- repositories
CREATE TYPE public.repository_status AS ENUM ('not_analyzed','queued','analyzing','ready','failed');

CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  owner TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL,
  default_branch TEXT NOT NULL DEFAULT 'main',
  description TEXT,
  status public.repository_status NOT NULL DEFAULT 'not_analyzed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT repositories_user_url_key UNIQUE (user_id, url)
);
CREATE INDEX repositories_user_id_idx ON public.repositories (user_id);
CREATE INDEX repositories_status_idx ON public.repositories (status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.repositories TO authenticated;
GRANT ALL ON public.repositories TO service_role;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "repositories_select_own" ON public.repositories FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "repositories_insert_own" ON public.repositories FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "repositories_update_own" ON public.repositories FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "repositories_delete_own" ON public.repositories FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER repositories_updated_at BEFORE UPDATE ON public.repositories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- analyses
CREATE TYPE public.analysis_status AS ENUM ('queued','running','completed','failed');

CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  status public.analysis_status NOT NULL DEFAULT 'queued',
  progress INTEGER NOT NULL DEFAULT 0,
  current_step TEXT,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analyses_repository_id_idx ON public.analyses (repository_id);
CREATE INDEX analyses_created_at_idx ON public.analyses (created_at DESC);
GRANT SELECT, INSERT, UPDATE ON public.analyses TO authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses_select_own" ON public.analyses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = analyses.repository_id AND r.user_id = auth.uid()));
CREATE POLICY "analyses_insert_own" ON public.analyses FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = analyses.repository_id AND r.user_id = auth.uid()));