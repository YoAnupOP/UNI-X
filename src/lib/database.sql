-- ============================================
-- UNI-X (University Xplore) Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  display_name TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  university TEXT DEFAULT '',
  department TEXT DEFAULT '',
  year TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  interests TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin', 'moderator')),
  is_verified BOOLEAN DEFAULT false,
  profile_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on username for fast lookups
CREATE UNIQUE INDEX idx_profiles_username ON public.profiles(username) WHERE username IS NOT NULL;

-- ============================================
-- 2. POSTS (Social Feed)
-- ============================================
CREATE TABLE public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT DEFAULT '',
  post_type TEXT DEFAULT 'general' CHECK (post_type IN ('general', 'club', 'event', 'achievement')),
  club_id UUID DEFAULT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- ============================================
-- 3. CLUBS & COMMUNITIES
-- ============================================
CREATE TABLE public.clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  cover_url TEXT DEFAULT '',
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'tech', 'arts', 'sports', 'academic', 'social', 'cultural')),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  members_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.club_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('member', 'moderator', 'admin')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

-- ============================================
-- 4. EVENTS & ANNOUNCEMENTS
-- ============================================
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  location TEXT DEFAULT '',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ,
  organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  club_id UUID DEFAULT NULL REFERENCES public.clubs(id) ON DELETE SET NULL,
  rsvp_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'going' CHECK (status IN ('going', 'interested', 'not_going')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. SWIPEX (Student Discovery)
-- ============================================
CREATE TABLE public.swipe_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  swiper_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('like', 'pass')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(swiper_id, swiped_id)
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  matched_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user1_id, user2_id)
);

-- ============================================
-- 6. UNIWALL (Memory Sharing)
-- ============================================
CREATE TABLE public.wall_posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.wall_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wall_post_id UUID NOT NULL REFERENCES public.wall_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(wall_post_id, user_id)
);

-- ============================================
-- 7. DIRECT MESSAGES
-- ============================================
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  last_message TEXT DEFAULT '',
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.conversation_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(conversation_id, user_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 8. NOTIFICATIONS
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'match', 'event', 'announcement', 'club', 'message')),
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  is_read BOOLEAN DEFAULT false,
  link TEXT DEFAULT '',
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 9. FOLLOWERS
-- ============================================
CREATE TABLE public.followers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

-- ============================================
-- INDEXES for Performance
-- ============================================
CREATE INDEX idx_posts_author ON public.posts(author_id);
CREATE INDEX idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX idx_posts_club ON public.posts(club_id);
CREATE INDEX idx_comments_post ON public.comments(post_id);
CREATE INDEX idx_likes_post ON public.likes(post_id);
CREATE INDEX idx_likes_user ON public.likes(user_id);
CREATE INDEX idx_club_members_club ON public.club_members(club_id);
CREATE INDEX idx_club_members_user ON public.club_members(user_id);
CREATE INDEX idx_events_date ON public.events(start_date);
CREATE INDEX idx_event_rsvps_event ON public.event_rsvps(event_id);
CREATE INDEX idx_swipe_actions_swiper ON public.swipe_actions(swiper_id);
CREATE INDEX idx_swipe_actions_swiped ON public.swipe_actions(swiped_id);
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX idx_messages_created ON public.messages(created_at);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_read ON public.notifications(user_id, is_read);
CREATE INDEX idx_wall_posts_author ON public.wall_posts(author_id);
CREATE INDEX idx_followers_follower ON public.followers(follower_id);
CREATE INDEX idx_followers_following ON public.followers(following_id);

-- ============================================
-- FUNCTIONS: Auto-create profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, university, profile_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'university', ''),
    false
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Posts are viewable by everyone" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own posts" ON public.posts FOR DELETE USING (auth.uid() = author_id);

-- Comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING (auth.uid() = author_id);

-- Likes
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Authenticated users can like" ON public.likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.likes FOR DELETE USING (auth.uid() = user_id);

-- Clubs
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clubs are viewable by everyone" ON public.clubs FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create clubs" ON public.clubs FOR INSERT WITH CHECK (auth.uid() = admin_id);
CREATE POLICY "Club admins can update" ON public.clubs FOR UPDATE USING (auth.uid() = admin_id);

-- Club Members
ALTER TABLE public.club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Club members are viewable by everyone" ON public.club_members FOR SELECT USING (true);
CREATE POLICY "Users can join clubs" ON public.club_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave clubs" ON public.club_members FOR DELETE USING (auth.uid() = user_id);

-- Events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Events are viewable by everyone" ON public.events FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create events" ON public.events FOR INSERT WITH CHECK (auth.uid() = organizer_id);
CREATE POLICY "Event organizers can update" ON public.events FOR UPDATE USING (auth.uid() = organizer_id);

-- Event RSVPs
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "RSVPs are viewable by everyone" ON public.event_rsvps FOR SELECT USING (true);
CREATE POLICY "Users can RSVP" ON public.event_rsvps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update RSVP" ON public.event_rsvps FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can remove RSVP" ON public.event_rsvps FOR DELETE USING (auth.uid() = user_id);

-- Announcements
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Announcements are viewable by everyone" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Admins can create announcements" ON public.announcements FOR INSERT WITH CHECK (auth.uid() = author_id);

-- SwipeX
ALTER TABLE public.swipe_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own swipes" ON public.swipe_actions FOR SELECT USING (auth.uid() = swiper_id);
CREATE POLICY "Users can swipe" ON public.swipe_actions FOR INSERT WITH CHECK (auth.uid() = swiper_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own matches" ON public.matches FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Wall Posts
ALTER TABLE public.wall_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public wall posts are viewable" ON public.wall_posts FOR SELECT USING (visibility = 'public' OR auth.uid() = author_id);
CREATE POLICY "Users can create wall posts" ON public.wall_posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Users can update own wall posts" ON public.wall_posts FOR UPDATE USING (auth.uid() = author_id);
CREATE POLICY "Users can delete own wall posts" ON public.wall_posts FOR DELETE USING (auth.uid() = author_id);

-- Wall Likes
ALTER TABLE public.wall_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Wall likes are viewable" ON public.wall_likes FOR SELECT USING (true);
CREATE POLICY "Users can like wall posts" ON public.wall_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike wall posts" ON public.wall_likes FOR DELETE USING (auth.uid() = user_id);

-- Helper function to get user's conversation IDs without triggering RLS recursion
-- SECURITY DEFINER bypasses RLS when called from other policies
CREATE OR REPLACE FUNCTION public.get_my_conversation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT conversation_id FROM conversation_participants WHERE user_id = auth.uid();
$$;

-- Conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (
  id IN (SELECT * FROM public.get_my_conversation_ids())
);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (
  id IN (SELECT * FROM public.get_my_conversation_ids())
);

-- Conversation Participants (fixed: was self-referencing → caused infinite RLS recursion)
ALTER TABLE public.conversation_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view participants in their conversations" ON public.conversation_participants FOR SELECT USING (
  conversation_id IN (SELECT * FROM public.get_my_conversation_ids())
);
CREATE POLICY "Users can add participants" ON public.conversation_participants FOR INSERT WITH CHECK (user_id = auth.uid());

-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view messages in their conversations" ON public.messages FOR SELECT USING (
  conversation_id IN (SELECT * FROM public.get_my_conversation_ids())
);
CREATE POLICY "Users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update messages in their conversations" ON public.messages FOR UPDATE USING (
  conversation_id IN (SELECT * FROM public.get_my_conversation_ids())
);

-- ============================================
-- ENABLE REALTIME for messaging tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- Followers
ALTER TABLE public.followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Followers are viewable by everyone" ON public.followers FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.followers FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.followers FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- STORAGE BUCKET SETUP
-- ============================================
-- Run these in Supabase SQL editor:
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('posts', 'posts', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('wall', 'wall', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('clubs', 'clubs', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('events', 'events', true);

-- ============================================
-- ADMIN POLICIES
-- ============================================
-- See src/lib/admin-policies.sql for the full set of admin RLS policies.
-- Run that file in the Supabase SQL Editor to enable admin management capabilities.
