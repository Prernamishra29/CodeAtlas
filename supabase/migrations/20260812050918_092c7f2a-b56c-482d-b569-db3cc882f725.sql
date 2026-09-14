ALTER TYPE public.analysis_status ADD VALUE IF NOT EXISTS 'cloning';
ALTER TYPE public.analysis_status ADD VALUE IF NOT EXISTS 'scanning';
ALTER TYPE public.analysis_status ADD VALUE IF NOT EXISTS 'analyzing';
ALTER TYPE public.analysis_status ADD VALUE IF NOT EXISTS 'cancelled';

ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS cancel_requested boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS dead_lettered boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS analyses_queue_idx ON public.analyses (status, next_run_at);

ALTER TABLE public.repositories
  ADD COLUMN IF NOT EXISTS last_analyzed_at timestamptz;

DROP TRIGGER IF EXISTS analyses_updated_at ON public.analyses;
CREATE TRIGGER analyses_updated_at BEFORE UPDATE ON public.analyses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY analyses_update_own ON public.analyses
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = analyses.repository_id AND r.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = analyses.repository_id AND r.user_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL UNIQUE REFERENCES public.analyses(id) ON DELETE CASCADE,
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  total_files integer NOT NULL DEFAULT 0,
  total_lines integer NOT NULL DEFAULT 0,
  total_bytes bigint NOT NULL DEFAULT 0,
  total_folders integer NOT NULL DEFAULT 0,
  languages jsonb NOT NULL DEFAULT '[]'::jsonb,
  folders jsonb NOT NULL DEFAULT '[]'::jsonb,
  largest_files jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.analysis_results TO authenticated;
GRANT ALL ON public.analysis_results TO service_role;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY analysis_results_select_own ON public.analysis_results
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.repositories r WHERE r.id = analysis_results.repository_id AND r.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS analysis_results_repository_idx ON public.analysis_results (repository_id, created_at DESC);