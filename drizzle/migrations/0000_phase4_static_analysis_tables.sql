-- Phase 4: real static analysis storage (files, symbols, dependencies, health)

CREATE TABLE public.code_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  path text NOT NULL,
  language text NOT NULL,
  lines integer NOT NULL DEFAULT 0,
  bytes integer NOT NULL DEFAULT 0,
  parsed boolean NOT NULL DEFAULT false,
  symbol_count integer NOT NULL DEFAULT 0,
  import_count integer NOT NULL DEFAULT 0,
  complexity integer NOT NULL DEFAULT 0,
  max_complexity integer NOT NULL DEFAULT 0,
  avg_complexity numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (analysis_id, path)
);

CREATE INDEX idx_code_files_repository ON public.code_files (repository_id);
CREATE INDEX idx_code_files_analysis ON public.code_files (analysis_id);
CREATE INDEX idx_code_files_path ON public.code_files (path);
CREATE INDEX idx_code_files_language ON public.code_files (language);

GRANT SELECT ON public.code_files TO authenticated;
GRANT ALL ON public.code_files TO service_role;
ALTER TABLE public.code_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own code files"
ON public.code_files FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.repositories r
  WHERE r.id = code_files.repository_id AND r.user_id = auth.uid()
));

CREATE TABLE public.symbols (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id uuid NOT NULL REFERENCES public.code_files(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol_type text NOT NULL,
  line integer NOT NULL DEFAULT 0,
  "column" integer NOT NULL DEFAULT 0,
  parent_symbol text,
  complexity integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_symbols_repository ON public.symbols (repository_id);
CREATE INDEX idx_symbols_file ON public.symbols (file_id);
CREATE INDEX idx_symbols_name ON public.symbols (name);
CREATE INDEX idx_symbols_type ON public.symbols (symbol_type);
CREATE INDEX idx_symbols_analysis ON public.symbols (analysis_id);

GRANT SELECT ON public.symbols TO authenticated;
GRANT ALL ON public.symbols TO service_role;
ALTER TABLE public.symbols ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own symbols"
ON public.symbols FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.repositories r
  WHERE r.id = symbols.repository_id AND r.user_id = auth.uid()
));

CREATE TABLE public.dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id uuid NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source_file_id uuid REFERENCES public.code_files(id) ON DELETE CASCADE,
  source_path text NOT NULL,
  target_file_id uuid REFERENCES public.code_files(id) ON DELETE CASCADE,
  target_path text NOT NULL,
  dependency_type text NOT NULL,
  specifier text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dependencies_repository ON public.dependencies (repository_id);
CREATE INDEX idx_dependencies_analysis ON public.dependencies (analysis_id);
CREATE INDEX idx_dependencies_source ON public.dependencies (source_file_id);
CREATE INDEX idx_dependencies_target ON public.dependencies (target_file_id);
CREATE INDEX idx_dependencies_type ON public.dependencies (dependency_type);

GRANT SELECT ON public.dependencies TO authenticated;
GRANT ALL ON public.dependencies TO service_role;
ALTER TABLE public.dependencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own dependencies"
ON public.dependencies FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.repositories r
  WHERE r.id = dependencies.repository_id AND r.user_id = auth.uid()
));

-- Aggregate analysis metrics from the parser
ALTER TABLE public.analysis_results
  ADD COLUMN IF NOT EXISTS total_symbols integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_functions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_classes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_dependencies integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_complexity numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_complexity integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS health jsonb NOT NULL DEFAULT '{}'::jsonb;
