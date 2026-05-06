
-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  name TEXT,
  weight_kg NUMERIC,
  height_cm NUMERIC,
  age INTEGER,
  sex TEXT,
  activity_level TEXT,
  dietary_prefs JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User goals
CREATE TABLE public.user_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  daily_calories INTEGER NOT NULL DEFAULT 2000,
  daily_proteins INTEGER NOT NULL DEFAULT 100,
  daily_carbs INTEGER NOT NULL DEFAULT 250,
  daily_fats INTEGER NOT NULL DEFAULT 70,
  goal_type TEXT DEFAULT 'maintain',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals all" ON public.user_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Meals
CREATE TABLE public.meals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  photo_url TEXT,
  meal_name TEXT NOT NULL,
  ingredients JSONB DEFAULT '[]'::jsonb,
  calories INTEGER NOT NULL DEFAULT 0,
  proteins NUMERIC NOT NULL DEFAULT 0,
  carbs NUMERIC NOT NULL DEFAULT 0,
  fats NUMERIC NOT NULL DEFAULT 0,
  portion_g NUMERIC,
  meal_type TEXT,
  notes TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX meals_user_scanned_idx ON public.meals(user_id, scanned_at DESC);
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meals all" ON public.meals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER goals_updated BEFORE UPDATE ON public.user_goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + default goals on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name) VALUES (NEW.id, NEW.raw_user_meta_data->>'name');
  INSERT INTO public.user_goals (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for meal photos
INSERT INTO storage.buckets (id, name, public) VALUES ('meals', 'meals', true);
CREATE POLICY "meal photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'meals');
CREATE POLICY "users upload own meal photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'meals' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "users delete own meal photos" ON storage.objects FOR DELETE USING (bucket_id = 'meals' AND auth.uid()::text = (storage.foldername(name))[1]);
