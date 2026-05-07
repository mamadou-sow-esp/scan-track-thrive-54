
-- Daily activity log (steps + computed burn)
CREATE TABLE public.daily_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  log_date date NOT NULL,
  steps integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, log_date)
);
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own logs all" ON public.daily_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_daily_logs_updated BEFORE UPDATE ON public.daily_logs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Planned meals (calendar future)
CREATE TABLE public.planned_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  planned_date date NOT NULL,
  meal_type text,
  meal_name text NOT NULL,
  calories integer NOT NULL DEFAULT 0,
  proteins numeric NOT NULL DEFAULT 0,
  carbs numeric NOT NULL DEFAULT 0,
  fats numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.planned_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own planned all" ON public.planned_meals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_daily_logs_user_date ON public.daily_logs(user_id, log_date DESC);
CREATE INDEX idx_planned_meals_user_date ON public.planned_meals(user_id, planned_date);
CREATE INDEX idx_meals_user_scanned ON public.meals(user_id, scanned_at DESC);
