// ============================================
// UNI-X TypeScript Type Definitions
// ============================================

export interface Profile {
    id: string
    email: string
    username: string
    full_name: string
    display_name: string
    avatar_url: string
    cover_url: string
    bio: string
    university: string
    department: string
    year: string
    skills: string[]
    interests: string[]
    is_public: boolean
    role: 'student' | 'admin' | 'moderator'
    is_verified: boolean
    profile_completed: boolean
    created_at: string
    updated_at: string
    last_seen_at?: string
}

export interface Post {
    id: string
    author_id: string
    content: string
    image_url: string
    post_type: 'general' | 'club' | 'event' | 'achievement'
    club_id: string | null
    likes_count: number
    comments_count: number
    created_at: string
    updated_at: string
    // Populated when fetched with relationships
    author?: Profile
    club?: Club
    is_liked?: boolean
}

export interface Comment {
    id: string
    post_id: string
    author_id: string
    content: string
    created_at: string
    author?: Profile
}

export interface Like {
    id: string
    post_id: string
    user_id: string
    created_at: string
}

export interface Club {
    id: string
    name: string
    description: string
    avatar_url: string
    cover_url: string
    category: 'general' | 'tech' | 'arts' | 'sports' | 'academic' | 'social' | 'cultural'
    admin_id: string
    members_count: number
    is_active: boolean
    created_at: string
    updated_at: string
    // Populated when fetched with relationships
    admin?: Profile
    is_member?: boolean
}

export interface ClubMember {
    id: string
    club_id: string
    user_id: string
    role: 'member' | 'moderator' | 'admin'
    joined_at: string
    user?: Profile
}

export interface Event {
    id: string
    title: string
    description: string
    image_url: string
    location: string
    start_date: string
    end_date: string | null
    organizer_id: string
    club_id: string | null
    rsvp_count: number
    is_active: boolean
    created_at: string
    organizer?: Profile
    club?: Club
    rsvp_status?: string
}

export interface EventRsvp {
    id: string
    event_id: string
    user_id: string
    status: 'going' | 'interested' | 'not_going'
    created_at: string
}

export interface Announcement {
    id: string
    title: string
    content: string
    author_id: string
    priority: 'low' | 'normal' | 'high' | 'urgent'
    is_active: boolean
    created_at: string
    author?: Profile
}

export interface SwipeAction {
    id: string
    swiper_id: string
    swiped_id: string
    action: 'like' | 'pass'
    created_at: string
}

export interface Match {
    id: string
    user1_id: string
    user2_id: string
    matched_at: string
    matched_user?: Profile
}

export interface WallPost {
    id: string
    author_id: string
    content: string
    image_url: string
    visibility: 'public' | 'private'
    likes_count: number
    created_at: string
    author?: Profile
    is_liked?: boolean
}

export interface Conversation {
    id: string
    last_message: string
    last_message_at: string
    created_at: string
    participant?: Profile
    unread_count?: number
}

export interface Message {
    id: string
    conversation_id: string
    sender_id: string
    content: string
    is_read: boolean
    created_at: string
    sender?: Profile
}

export interface Notification {
    id: string
    user_id: string
    type: 'like' | 'comment' | 'follow' | 'match' | 'event' | 'announcement' | 'club' | 'message'
    title: string
    body: string
    is_read: boolean
    link: string
    actor_id: string | null
    created_at: string
    actor?: Profile
}

export interface Follower {
    id: string
    follower_id: string
    following_id: string
    created_at: string
    follower?: Profile
    following?: Profile
}
