-- =====================================================
-- English Garden: multi-user auth, RLS, storage, indexes
-- =====================================================

-- ---------- usernames table (maps username -> auth uid) ----------
CREATE TABLE IF NOT EXISTS public.usernames (
  user_id   uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username  text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- case-insensitive unique username
CREATE UNIQUE INDEX IF NOT EXISTS usernames_username_lower_uniq
  ON public.usernames (lower(username));

-- ---------- add user_id + updated_at to user-owned tables ----------
ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.review_days
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------- indexes for query performance ----------
CREATE INDEX IF NOT EXISTS idx_words_user_id        ON public.words (user_id);
CREATE INDEX IF NOT EXISTS idx_words_user_status   ON public.words (user_id, status);
CREATE INDEX IF NOT EXISTS idx_words_user_category ON public.words (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_words_user_due       ON public.words (user_id, srs_due);
CREATE INDEX IF NOT EXISTS idx_words_user_updated   ON public.words (user_id, updated_at);
CREATE INDEX IF NOT EXISTS idx_words_user_word      ON public.words (user_id, word);

CREATE INDEX IF NOT EXISTS idx_categories_user_id    ON public.categories (user_id);

CREATE INDEX IF NOT EXISTS idx_reviews_user_id       ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_word_id      ON public.reviews (word_id);

CREATE INDEX IF NOT EXISTS idx_review_days_user_id   ON public.review_days (user_id);
CREATE INDEX IF NOT EXISTS idx_review_days_user_date ON public.review_days (user_id, review_date);

CREATE INDEX IF NOT EXISTS idx_usernames_username    ON public.usernames (lower(username));

-- ---------- updated_at trigger ----------
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_words_updated      ON public.words;
CREATE TRIGGER trg_words_updated      BEFORE UPDATE ON public.words      FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated ON public.categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =====================================================
-- Row Level Security — drop open anon policies, add per-user
-- =====================================================

-- ---------- words ----------
DROP POLICY IF EXISTS anon_select_words ON public.words;
DROP POLICY IF EXISTS anon_insert_words ON public.words;
DROP POLICY IF EXISTS anon_update_words ON public.words;
DROP POLICY IF EXISTS anon_delete_words ON public.words;

CREATE POLICY words_select_own ON public.words
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY words_insert_own ON public.words
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY words_update_own ON public.words
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY words_delete_own ON public.words
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- categories ----------
DROP POLICY IF EXISTS anon_select_categories ON public.categories;
DROP POLICY IF EXISTS anon_insert_categories ON public.categories;
DROP POLICY IF EXISTS anon_update_categories ON public.categories;
DROP POLICY IF EXISTS anon_delete_categories ON public.categories;

CREATE POLICY categories_select_own ON public.categories
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY categories_insert_own ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY categories_update_own ON public.categories
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY categories_delete_own ON public.categories
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- reviews ----------
DROP POLICY IF EXISTS anon_select_reviews ON public.reviews;
DROP POLICY IF EXISTS anon_insert_reviews ON public.reviews;
DROP POLICY IF EXISTS anon_update_reviews ON public.reviews;
DROP POLICY IF EXISTS anon_delete_reviews ON public.reviews;

CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY reviews_delete_own ON public.reviews
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- review_days ----------
DROP POLICY IF EXISTS anon_select_review_days ON public.review_days;
DROP POLICY IF EXISTS anon_insert_review_days ON public.review_days;
DROP POLICY IF EXISTS anon_update_review_days ON public.review_days;
DROP POLICY IF EXISTS anon_delete_review_days ON public.review_days;

CREATE POLICY review_days_select_own ON public.review_days
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY review_days_insert_own ON public.review_days
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY review_days_update_own ON public.review_days
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY review_days_delete_own ON public.review_days
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ---------- usernames ----------
ALTER TABLE public.usernames ENABLE ROW LEVEL SECURITY;

CREATE POLICY usernames_select_own ON public.usernames
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY usernames_insert_own ON public.usernames
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY usernames_delete_own ON public.usernames
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- =====================================================
-- Storage bucket for vocabulary images
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('word-images', 'word-images', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
-- Path convention: <user_id>/<word_id>.<ext>

CREATE POLICY "images_select_own" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'word-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "images_insert_own" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'word-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "images_update_own" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'word-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'word-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "images_delete_own" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'word-images'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );