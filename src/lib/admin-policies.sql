-- ============================================
-- UNI-X Admin RLS Policies
-- ============================================
-- Run these in the Supabase SQL Editor to give admin users
-- the ability to manage all platform content.
--
-- NOTE: The /api/admin/* routes use the service role client
-- which bypasses RLS entirely. These policies are a
-- defense-in-depth layer for any direct client queries.
-- ============================================

-- Helper: Check if current user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ============================================
-- PROFILES: Admin can update and delete any profile
-- ============================================
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.is_admin());

-- ============================================
-- POSTS: Admin can update and delete any post
-- ============================================
CREATE POLICY "Admins can update any post"
  ON public.posts FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  USING (public.is_admin());

-- ============================================
-- COMMENTS: Admin can delete any comment
-- ============================================
CREATE POLICY "Admins can delete any comment"
  ON public.comments FOR DELETE
  USING (public.is_admin());

-- ============================================
-- CLUBS: Admin can update and delete any club
-- ============================================
CREATE POLICY "Admins can update any club"
  ON public.clubs FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any club"
  ON public.clubs FOR DELETE
  USING (public.is_admin());

-- ============================================
-- EVENTS: Admin can update and delete any event
-- ============================================
CREATE POLICY "Admins can update any event"
  ON public.events FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any event"
  ON public.events FOR DELETE
  USING (public.is_admin());

-- ============================================
-- ANNOUNCEMENTS: Admin can update and delete any announcement
-- ============================================
CREATE POLICY "Admins can update any announcement"
  ON public.announcements FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins can delete any announcement"
  ON public.announcements FOR DELETE
  USING (public.is_admin());

-- ============================================
-- WALL POSTS: Admin can delete any wall post
-- ============================================
CREATE POLICY "Admins can delete any wall post"
  ON public.wall_posts FOR DELETE
  USING (public.is_admin());

-- ============================================
-- WALL LIKES: Admin can delete any wall like (for moderation cleanup)
-- ============================================
CREATE POLICY "Admins can delete any wall like"
  ON public.wall_likes FOR DELETE
  USING (public.is_admin());

-- ============================================
-- LIKES: Admin can delete any like (for moderation cleanup)
-- ============================================
CREATE POLICY "Admins can delete any like"
  ON public.likes FOR DELETE
  USING (public.is_admin());
