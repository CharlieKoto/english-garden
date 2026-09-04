-- =====================================================================
-- English Garden — accounts, folders, and folder sharing
-- ---------------------------------------------------------------------
-- Consolidated and idempotent: safe to run on an empty project OR on a
-- project that already has some of these tables. Supersedes the earlier
-- 20260809 migration (which assumed the base tables already existed).
-- Run this whole file once in the Supabase SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------

-- username -> auth uid. Usernames are the public handle used for sharing.
CREATE TABLE IF NOT EXISTS public.usernames (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS usernames_username_lower_uniq
  ON public.usernames (lower(username));

-- Folders (the app calls these "folders"; the table keeps its original name).
CREATE TABLE IF NOT EXISTS public.categories (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  color      text NOT NULL DEFAULT '#7c9885',
  icon       text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.words (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word           text NOT NULL,
  definition     text,
  part_of_speech text,
  ipa            text,
  example        text,
  image_url      text,
  association    text,
  story          text,
  status         text NOT NULL DEFAULT 'dont_know',
  category_id    uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  difficulty     int  NOT NULL DEFAULT 1,
  favorite       boolean NOT NULL DEFAULT false,
  notes          text,
  srs_interval   int  NOT NULL DEFAULT 0,
  srs_ease       real NOT NULL DEFAULT 2.5,
  srs_reps       int  NOT NULL DEFAULT 0,
  srs_due        date NOT NULL DEFAULT current_date,
  last_reviewed  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reviews (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  word_id       uuid REFERENCES public.words(id) ON DELETE CASCADE,
  rating        text NOT NULL,
  reviewed_at   timestamptz NOT NULL DEFAULT now(),
  prev_interval int,
  new_interval  int
);

CREATE TABLE IF NOT EXISTS public.review_days (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_date   date NOT NULL,
  review_count  int NOT NULL DEFAULT 0,
  learned_count int NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 2. Ownership + folder visibility columns
-- ---------------------------------------------------------------------

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS visibility  text NOT NULL DEFAULT 'private',
  ADD COLUMN IF NOT EXISTS updated_at  timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.words
  ADD COLUMN IF NOT EXISTS user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.reviews
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE public.review_days
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- visibility is either 'private' (only owner + explicitly shared users)
-- or 'public' (listed on the Discover page for every signed-in user).
DO $$ BEGIN
  ALTER TABLE public.categories
    ADD CONSTRAINT categories_visibility_chk
    CHECK (visibility IN ('private', 'public'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- One row per (folder, recipient) pair: a private share to a single user.
CREATE TABLE IF NOT EXISTS public.folder_shares (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id   uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  owner_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_with uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (folder_id, shared_with)
);

-- ---------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_words_user_id         ON public.words (user_id);
CREATE INDEX IF NOT EXISTS idx_words_user_status     ON public.words (user_id, status);
CREATE INDEX IF NOT EXISTS idx_words_user_category   ON public.words (user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_words_user_due        ON public.words (user_id, srs_due);
CREATE INDEX IF NOT EXISTS idx_words_category        ON public.words (category_id);

CREATE INDEX IF NOT EXISTS idx_categories_user_id    ON public.categories (user_id);
CREATE INDEX IF NOT EXISTS idx_categories_public     ON public.categories (visibility) WHERE visibility = 'public';

CREATE INDEX IF NOT EXISTS idx_reviews_user_id       ON public.reviews (user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_word_id       ON public.reviews (word_id);

CREATE INDEX IF NOT EXISTS idx_review_days_user_date ON public.review_days (user_id, review_date);

CREATE INDEX IF NOT EXISTS idx_shares_recipient      ON public.folder_shares (shared_with);
CREATE INDEX IF NOT EXISTS idx_shares_folder         ON public.folder_shares (folder_id);

-- ---------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_words_updated ON public.words;
CREATE TRIGGER trg_words_updated
  BEFORE UPDATE ON public.words
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_categories_updated ON public.categories;
CREATE TRIGGER trg_categories_updated
  BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 5. Access helper
--
-- SECURITY DEFINER so it bypasses RLS internally. This is what stops the
-- policies below from recursing: the categories policy needs to consult
-- folder_shares, and the folder_shares policy needs to consult categories.
-- ---------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.can_read_folder(fid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.categories c
    WHERE c.id = fid
      AND (
        c.user_id = auth.uid()
        OR c.visibility = 'public'
        OR EXISTS (
          SELECT 1 FROM public.folder_shares s
          WHERE s.folder_id = c.id AND s.shared_with = auth.uid()
        )
      )
  );
$$;

-- ---------------------------------------------------------------------
-- 6. Row Level Security
-- ---------------------------------------------------------------------

ALTER TABLE public.usernames     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.words         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_days   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_shares ENABLE ROW LEVEL SECURITY;

-- Clear any policies from earlier iterations of the schema.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('usernames','categories','words','reviews','review_days','folder_shares')
  LOOP
    EXECUTE format('DROP POLICY %I ON %I.%I', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---------- usernames: you can only read/write your own row ----------
-- (looking up someone else's username goes through the RPCs in section 7)
CREATE POLICY usernames_select_own ON public.usernames
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY usernames_insert_own ON public.usernames
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY usernames_update_own ON public.usernames
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- categories / folders ----------
-- Readable if you own it, it's public, or it was shared with you.
-- Writable only by the owner.
CREATE POLICY categories_select_readable ON public.categories
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_read_folder(id));

CREATE POLICY categories_insert_own ON public.categories
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_update_own ON public.categories
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY categories_delete_own ON public.categories
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------- words ----------
-- Readable if you own it, or it sits in a folder you're allowed to read.
-- Only ever writable by the owner — shared access is strictly read-only.
CREATE POLICY words_select_readable ON public.words
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (category_id IS NOT NULL AND public.can_read_folder(category_id))
  );

CREATE POLICY words_insert_own ON public.words
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY words_update_own ON public.words
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY words_delete_own ON public.words
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------- reviews + review_days: strictly private ----------
CREATE POLICY reviews_select_own ON public.reviews
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY reviews_insert_own ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_update_own ON public.reviews
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY reviews_delete_own ON public.reviews
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY review_days_select_own ON public.review_days
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY review_days_insert_own ON public.review_days
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY review_days_update_own ON public.review_days
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY review_days_delete_own ON public.review_days
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ---------- folder_shares ----------
-- The owner manages shares; the recipient can see (and revoke) their own.
CREATE POLICY shares_select_involved ON public.folder_shares
  FOR SELECT TO authenticated
  USING (owner_id = auth.uid() OR shared_with = auth.uid());

CREATE POLICY shares_insert_owner ON public.folder_shares
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY shares_delete_involved ON public.folder_shares
  FOR DELETE TO authenticated
  USING (owner_id = auth.uid() OR shared_with = auth.uid());

-- ---------------------------------------------------------------------
-- 7. RPCs
--
-- These are SECURITY DEFINER so they can read across users in the narrow,
-- controlled ways the app needs — without opening up the usernames table
-- to bulk enumeration.
-- ---------------------------------------------------------------------

-- Called on the sign-up screen before creating the auth user, so we never
-- leave an orphaned account behind when a name is taken.
CREATE OR REPLACE FUNCTION public.username_available(p_username text)
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.usernames
    WHERE lower(username) = lower(trim(p_username))
  );
$$;

GRANT EXECUTE ON FUNCTION public.username_available(text) TO anon, authenticated;

-- Share a folder you own with one specific user, by their username.
CREATE OR REPLACE FUNCTION public.share_folder(p_folder uuid, p_username text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_target uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.categories
    WHERE id = p_folder AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You can only share folders you own.';
  END IF;

  SELECT user_id INTO v_target
  FROM public.usernames
  WHERE lower(username) = lower(trim(p_username));

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'No user named "%" exists.', trim(p_username);
  END IF;

  IF v_target = auth.uid() THEN
    RAISE EXCEPTION 'That folder is already yours.';
  END IF;

  INSERT INTO public.folder_shares (folder_id, owner_id, shared_with)
  VALUES (p_folder, auth.uid(), v_target)
  ON CONFLICT (folder_id, shared_with) DO NOTHING;
END $$;

GRANT EXECUTE ON FUNCTION public.share_folder(uuid, text) TO authenticated;

-- Revoke a share. Callable by the owner, or by the recipient removing themselves.
CREATE OR REPLACE FUNCTION public.unshare_folder(p_folder uuid, p_user uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  DELETE FROM public.folder_shares
  WHERE folder_id = p_folder
    AND shared_with = p_user
    AND (owner_id = auth.uid() OR shared_with = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.unshare_folder(uuid, uuid) TO authenticated;

-- Who is a folder of mine currently shared with?
CREATE OR REPLACE FUNCTION public.list_folder_shares(p_folder uuid)
RETURNS TABLE (user_id uuid, username text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT s.shared_with, u.username, s.created_at
  FROM public.folder_shares s
  JOIN public.usernames u ON u.user_id = s.shared_with
  WHERE s.folder_id = p_folder
    AND EXISTS (
      SELECT 1 FROM public.categories c
      WHERE c.id = p_folder AND c.user_id = auth.uid()
    )
  ORDER BY s.created_at;
$$;

GRANT EXECUTE ON FUNCTION public.list_folder_shares(uuid) TO authenticated;

-- Discover page: every public folder, with its owner's handle and word count.
CREATE OR REPLACE FUNCTION public.list_public_folders(p_search text DEFAULT NULL)
RETURNS TABLE (
  id uuid, name text, description text, color text, icon text,
  owner_id uuid, owner_username text, word_count bigint, created_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    c.id, c.name, c.description, c.color, c.icon,
    c.user_id,
    u.username,
    (SELECT count(*) FROM public.words w WHERE w.category_id = c.id),
    c.created_at
  FROM public.categories c
  JOIN public.usernames u ON u.user_id = c.user_id
  WHERE c.visibility = 'public'
    AND c.user_id <> auth.uid()
    AND (
      p_search IS NULL OR trim(p_search) = ''
      OR c.name ILIKE '%' || trim(p_search) || '%'
      OR u.username ILIKE '%' || trim(p_search) || '%'
    )
  ORDER BY c.created_at DESC
  LIMIT 200;
$$;

GRANT EXECUTE ON FUNCTION public.list_public_folders(text) TO authenticated;

-- Folders other people have shared directly with me.
CREATE OR REPLACE FUNCTION public.list_shared_with_me()
RETURNS TABLE (
  id uuid, name text, description text, color text, icon text,
  owner_id uuid, owner_username text, word_count bigint, shared_at timestamptz
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    c.id, c.name, c.description, c.color, c.icon,
    c.user_id,
    u.username,
    (SELECT count(*) FROM public.words w WHERE w.category_id = c.id),
    s.created_at
  FROM public.folder_shares s
  JOIN public.categories c ON c.id = s.folder_id
  JOIN public.usernames  u ON u.user_id = c.user_id
  WHERE s.shared_with = auth.uid()
  ORDER BY s.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.list_shared_with_me() TO authenticated;

-- Metadata for a single folder I'm allowed to read (used by the folder viewer).
CREATE OR REPLACE FUNCTION public.get_readable_folder(p_folder uuid)
RETURNS TABLE (
  id uuid, name text, description text, color text, icon text,
  owner_id uuid, owner_username text, visibility text, word_count bigint
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT
    c.id, c.name, c.description, c.color, c.icon,
    c.user_id, u.username, c.visibility,
    (SELECT count(*) FROM public.words w WHERE w.category_id = c.id)
  FROM public.categories c
  JOIN public.usernames u ON u.user_id = c.user_id
  WHERE c.id = p_folder
    AND public.can_read_folder(c.id);
$$;

GRANT EXECUTE ON FUNCTION public.get_readable_folder(uuid) TO authenticated;

-- Copy a folder I can read into my own garden, as a fresh independent folder.
-- SRS state is reset so the copy starts from scratch for the new owner.
CREATE OR REPLACE FUNCTION public.copy_folder_to_my_garden(p_folder uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_new_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in.';
  END IF;

  IF NOT public.can_read_folder(p_folder) THEN
    RAISE EXCEPTION 'You do not have access to that folder.';
  END IF;

  INSERT INTO public.categories (name, description, color, icon, user_id, visibility)
  SELECT c.name, c.description, c.color, c.icon, auth.uid(), 'private'
  FROM public.categories c
  WHERE c.id = p_folder
  RETURNING id INTO v_new_id;

  INSERT INTO public.words (
    word, definition, part_of_speech, ipa, example, image_url,
    association, story, status, category_id, difficulty, favorite, notes,
    srs_interval, srs_ease, srs_reps, srs_due, last_reviewed, user_id
  )
  SELECT
    w.word, w.definition, w.part_of_speech, w.ipa, w.example, w.image_url,
    w.association, w.story, 'dont_know', v_new_id, w.difficulty, false, w.notes,
    0, 2.5, 0, current_date, NULL, auth.uid()
  FROM public.words w
  WHERE w.category_id = p_folder;

  RETURN v_new_id;
END $$;

GRANT EXECUTE ON FUNCTION public.copy_folder_to_my_garden(uuid) TO authenticated;

-- ---------------------------------------------------------------------
-- 8. Storage bucket for word images (optional — skipped if not permitted)
-- ---------------------------------------------------------------------

DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('word-images', 'word-images', true)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    DROP POLICY IF EXISTS images_read_all  ON storage.objects;
    DROP POLICY IF EXISTS images_write_own ON storage.objects;
    DROP POLICY IF EXISTS images_update_own ON storage.objects;
    DROP POLICY IF EXISTS images_delete_own ON storage.objects;

    -- Images are readable by anyone (a shared folder's pictures must load
    -- for the recipient); writes stay scoped to <user_id>/<file>.
    CREATE POLICY images_read_all ON storage.objects
      FOR SELECT USING (bucket_id = 'word-images');

    CREATE POLICY images_write_own ON storage.objects
      FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'word-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY images_update_own ON storage.objects
      FOR UPDATE TO authenticated
      USING (
        bucket_id = 'word-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );

    CREATE POLICY images_delete_own ON storage.objects
      FOR DELETE TO authenticated
      USING (
        bucket_id = 'word-images'
        AND auth.uid()::text = (storage.foldername(name))[1]
      );
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'Skipped storage policies (insufficient privilege) — set them in the dashboard if you use image uploads.';
  END;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Skipped storage bucket setup (insufficient privilege).';
END $$;
