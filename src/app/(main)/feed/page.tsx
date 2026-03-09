'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Post, Profile } from '@/lib/types'
import {
    Heart,
    MessageCircle,
    Share2,
    Send,
    MoreHorizontal,
    Loader2,
    Trash2,
    ImagePlus,
    X,
    UserPlus,
    UserCheck,
    Check,
} from 'lucide-react'
import { uploadImage } from '@/lib/upload'
import { getStaleCache, setCache, isCacheFresh } from '@/lib/cache'
import Link from 'next/link'

function timeAgo(date: string) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
    return new Date(date).toLocaleDateString()
}

function PostCard({
    post, currentUserId, onLike, onDelete, onComment,
}: {
    post: Post & { author: Profile }
    currentUserId: string
    onLike: (id: string) => void
    onDelete: (id: string) => void
    onComment: (id: string, content: string) => void
}) {
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [comments, setComments] = useState<Array<{ id: string; content: string; author: Profile; created_at: string }>>([])
    const [loadingComments, setLoadingComments] = useState(false)
    const [showMenu, setShowMenu] = useState(false)
    const [copied, setCopied] = useState(false)
    const supabase = createClient()

    const handleShare = () => {
        const url = `${window.location.origin}/feed?post=${post.id}`
        navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const loadComments = async () => {
        if (!showComments) {
            setShowComments(true)
            setLoadingComments(true)
            const { data } = await supabase
                .from('comments').select('*, author:profiles(*)').eq('post_id', post.id).order('created_at', { ascending: true })
            if (data) setComments(data as Array<{ id: string; content: string; author: Profile; created_at: string }>)
            setLoadingComments(false)
        } else {
            setShowComments(false)
        }
    }

    // Real-time comments: subscribe when comment section is open, unsubscribe when closed
    useEffect(() => {
        if (!showComments) return

        const channel = supabase
            .channel(`comments-${post.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
                async (payload) => {
                    // Fetch the full comment with author profile
                    const { data } = await supabase
                        .from('comments')
                        .select('*, author:profiles(*)')
                        .eq('id', payload.new.id)
                        .single()
                    if (data) {
                        setComments(prev => {
                            if (prev.some(c => c.id === data.id)) return prev
                            return [...prev, data as { id: string; content: string; author: Profile; created_at: string }]
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'comments', filter: `post_id=eq.${post.id}` },
                (payload) => {
                    setComments(prev => prev.filter(c => c.id !== payload.old.id))
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [showComments, post.id, supabase])

    const handleComment = () => {
        if (!commentText.trim()) return
        onComment(post.id, commentText)
        setCommentText('')
    }

    return (
        <div style={{
            borderRadius: '16px',
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            overflow: 'hidden',
            transition: 'box-shadow 0.2s',
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: post.author?.avatar_url
                            ? `url(${post.author.avatar_url}) center/cover`
                            : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        color: 'white', fontSize: '14px', fontWeight: 700,
                    }}>
                        {!post.author?.avatar_url && (post.author?.full_name?.[0] || '?')}
                    </div>
                    <div>
                        <p style={{ fontSize: '14px', fontWeight: 600 }}>
                            {post.author?.full_name || 'Unknown'}
                            {post.author?.username && (
                                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '6px', fontSize: '13px' }}>
                                    @{post.author.username}
                                </span>
                            )}
                        </p>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{timeAgo(post.created_at)}</p>
                    </div>
                </div>
                {post.author_id === currentUserId && (
                    <div style={{ position: 'relative' }}>
                        <button onClick={() => setShowMenu(!showMenu)} style={{
                            padding: '6px', borderRadius: '8px', color: 'var(--color-text-muted)',
                            cursor: 'pointer', background: 'none', border: 'none',
                        }}>
                            <MoreHorizontal size={18} />
                        </button>
                        {showMenu && (
                            <div className="animate-scale-in" style={{
                                position: 'absolute', right: 0, top: '32px', width: '140px', padding: '6px',
                                borderRadius: '12px', backgroundColor: 'var(--color-bg-elevated)',
                                border: '1px solid var(--color-border)', boxShadow: 'var(--shadow-lg)', zIndex: 10,
                            }}>
                                <button onClick={() => { onDelete(post.id); setShowMenu(false) }} style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
                                    padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
                                    color: '#F87171', cursor: 'pointer', background: 'none', border: 'none',
                                }}>
                                    <Trash2 size={14} /> Delete
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Content */}
            <div style={{ padding: '12px 20px 16px' }}>
                <p style={{ fontSize: '14px', lineHeight: 1.7, whiteSpace: 'pre-wrap', color: 'var(--color-text-primary)' }}>
                    {post.content}
                </p>
            </div>

            {/* Image */}
            {post.image_url && (
                <div style={{ padding: '0 20px 16px' }}>
                    <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: '12px', objectFit: 'cover', maxHeight: '400px' }} />
                </div>
            )}

            {/* Actions */}
            <div style={{
                display: 'flex', alignItems: 'center', gap: '4px', padding: '12px 16px',
                borderTop: '1px solid var(--color-border)',
            }}>
                <button onClick={() => onLike(post.id)} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'none', border: 'none',
                    color: post.is_liked ? '#F87171' : 'var(--color-text-muted)', transition: 'color 0.15s',
                }}>
                    <Heart size={16} fill={post.is_liked ? 'currentColor' : 'none'} />
                    <span>{post.likes_count || 0}</span>
                </button>
                <button onClick={loadComments} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'none', border: 'none',
                    color: 'var(--color-text-muted)',
                }}>
                    <MessageCircle size={16} />
                    <span>{post.comments_count || 0}</span>
                </button>
                <button onClick={handleShare} style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                    borderRadius: '8px', fontSize: '13px', cursor: 'pointer', background: 'none', border: 'none',
                    color: copied ? 'var(--color-success)' : 'var(--color-text-muted)', transition: 'color 0.2s',
                }}>
                    {copied ? <Check size={16} /> : <Share2 size={16} />}
                    <span>{copied ? 'Copied!' : 'Share'}</span>
                </button>
            </div>

            {/* Comments */}
            {showComments && (
                <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--color-border)' }}>
                    {loadingComments ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                            <Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '12px' }}>
                            {comments.map(c => (
                                <div key={c.id} style={{ display: 'flex', gap: '10px' }}>
                                    <div style={{
                                        width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        color: 'white', fontSize: '10px', fontWeight: 700,
                                    }}>{c.author?.full_name?.[0] || '?'}</div>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ fontSize: '12px', fontWeight: 600 }}>{c.author?.full_name}</span>
                                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{timeAgo(c.created_at)}</span>
                                        </div>
                                        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{c.content}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Comment input */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
                        <input
                            type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            style={{
                                flex: 1, padding: '8px 12px', borderRadius: '10px', fontSize: '13px',
                                backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)', outline: 'none',
                            }}
                            onKeyDown={e => e.key === 'Enter' && handleComment()}
                        />
                        <button onClick={handleComment} style={{
                            padding: '8px', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none',
                            color: commentText.trim() ? 'var(--color-primary)' : 'var(--color-text-muted)',
                        }}>
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function SuggestionsWidget({ currentUser, profile }: { currentUser: string; profile: Profile | null }) {
    const [suggestions, setSuggestions] = useState<Profile[]>([])
    const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
    const [loading, setLoading] = useState(true)
    const supabase = createClient()

    useEffect(() => {
        const fetchSuggestions = async () => {
            // Get who current user already follows
            const { data: following } = await supabase.from('followers').select('following_id').eq('follower_id', currentUser)
            const followingIds = following?.map(f => f.following_id) || []

            const buildQuery = (filterUni: boolean) => {
                let q = supabase.from('profiles').select('*').neq('id', currentUser).limit(5)
                if (followingIds.length > 0) {
                    q = q.not('id', 'in', `(${followingIds.join(',')})`)
                }
                if (filterUni && profile?.university) {
                    q = q.eq('university', profile.university)
                }
                return q
            }

            // Try same university first, then fallback to all
            let { data } = await buildQuery(true)
            if (!data?.length) {
                const res = await buildQuery(false)
                data = res.data
            }
            setSuggestions((data as Profile[]) || [])
            setLoading(false)
        }
        fetchSuggestions()
    }, [currentUser, profile])

    const handleFollow = async (id: string) => {
        if (followedIds.has(id)) {
            await supabase.from('followers').delete().eq('follower_id', currentUser).eq('following_id', id)
            setFollowedIds(prev => { const n = new Set(prev); n.delete(id); return n })
        } else {
            await supabase.from('followers').insert({ follower_id: currentUser, following_id: id })
            setFollowedIds(prev => new Set(prev).add(id))
        }
    }

    if (loading || suggestions.length === 0) return null

    return (
        <div style={{
            borderRadius: '16px', padding: '20px', backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)', position: 'sticky', top: '100px',
        }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '15px', fontWeight: 700, margin: '0 0 16px 0', color: 'var(--color-text-primary)' }}>
                Suggested for You
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {suggestions.map(s => {
                    const isFollowed = followedIds.has(s.id)
                    return (
                        <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Link href={`/profile/${s.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}>
                                <div style={{
                                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                                    background: s.avatar_url ? `url(${s.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '14px', fontWeight: 700,
                                }}>
                                    {!s.avatar_url && (s.full_name?.[0] || '?')}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {s.full_name || 'Student'}
                                    </p>
                                    {s.username && (
                                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>@{s.username}</p>
                                    )}
                                </div>
                            </Link>
                            <button
                                onClick={() => handleFollow(s.id)}
                                style={{
                                    padding: '6px 14px', borderRadius: '10px', fontSize: '12px', fontWeight: 600,
                                    cursor: 'pointer', flexShrink: 0, border: 'none', transition: 'all 0.2s',
                                    background: isFollowed ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                    color: isFollowed ? 'var(--color-text-muted)' : 'white',
                                }}
                            >
                                {isFollowed ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><UserCheck size={12} /> Following</span> : <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><UserPlus size={12} /> Follow</span>}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default function FeedPage() {
    const { user, profile, loading: authLoading } = useAuth()
    // Show stale data immediately (no loading flash), fresh cache within 5min skips fetch entirely
    const [posts, setPosts] = useState<(Post & { author: Profile })[]>(() => getStaleCache('feed-posts') || [])
    const [loading, setLoading] = useState(() => !getStaleCache('feed-posts'))
    const [newPostContent, setNewPostContent] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [showCreatePost, setShowCreatePost] = useState(false)
    const [posting, setPosting] = useState(false)
    const supabase = createClient()

    const fetchPosts = useCallback(async (skipIfFresh = false) => {
        if (skipIfFresh && isCacheFresh('feed-posts')) return
        try {
            const { data: postsData } = await supabase
                .from('posts').select('*, author:profiles(*)').order('created_at', { ascending: false }).limit(50)

            if (postsData && user) {
                const { data: likedPosts } = await supabase.from('likes').select('post_id').eq('user_id', user.id)
                const likedIds = new Set(likedPosts?.map(l => l.post_id))
                const result = postsData.map(p => ({ ...p, is_liked: likedIds.has(p.id) })) as (Post & { author: Profile })[]
                setPosts(result)
                setCache('feed-posts', result)
            } else if (postsData) {
                setPosts(postsData as (Post & { author: Profile })[])
                setCache('feed-posts', postsData)
            }
        } catch (e) {
            console.error('Failed to fetch posts:', e)
        } finally {
            setLoading(false)
        }
    }, [user, supabase])

    useEffect(() => {
        if (!authLoading) fetchPosts(true)
    }, [fetchPosts, authLoading])

    // Real-time subscription for new posts, updates, and deletes
    useEffect(() => {
        const channel = supabase
            .channel('feed-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'posts' },
                async (payload) => {
                    // Fetch the full post with author profile
                    const { data } = await supabase
                        .from('posts')
                        .select('*, author:profiles(*)')
                        .eq('id', payload.new.id)
                        .single()
                    if (data) {
                        const newPost = { ...data, is_liked: false } as Post & { author: Profile }
                        setPosts(prev => {
                            // Avoid duplicates (e.g. if our own post already added optimistically)
                            if (prev.some(p => p.id === newPost.id)) return prev
                            const updated = [newPost, ...prev]
                            setCache('feed-posts', updated)
                            return updated
                        })
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'posts' },
                (payload) => {
                    setPosts(prev => {
                        const updated = prev.map(p =>
                            p.id === payload.new.id
                                ? { ...p, ...payload.new, author: p.author }
                                : p
                        ) as (Post & { author: Profile })[]
                        setCache('feed-posts', updated)
                        return updated
                    })
                }
            )
            .on(
                'postgres_changes',
                { event: 'DELETE', schema: 'public', table: 'posts' },
                (payload) => {
                    setPosts(prev => {
                        const updated = prev.filter(p => p.id !== payload.old.id)
                        setCache('feed-posts', updated)
                        return updated
                    })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleCreatePost = async () => {
        if ((!newPostContent.trim() && !imageFile) || !user) return
        setPosting(true)
        let imageUrl = null

        if (imageFile) {
            try {
                imageUrl = await uploadImage(imageFile, 'uploads')
            } catch (err) {
                console.error(err)
                setPosting(false)
                alert('Image upload failed. Please ensure the "uploads" bucket exists.')
                return
            }
        }

        const { error } = await supabase.from('posts').insert({
            author_id: user.id,
            content: newPostContent,
            post_type: 'general',
            image_url: imageUrl
        })
        if (!error) {
            setNewPostContent('')
            setImageFile(null)
            setImagePreview(null)
            setShowCreatePost(false)
            fetchPosts()
        }
        setPosting(false)
    }

    const handleLike = async (postId: string) => {
        if (!user) return
        const post = posts.find(p => p.id === postId)
        if (!post) return

        // Optimistic UI update
        const isCurrentlyLiked = post.is_liked
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, is_liked: !isCurrentlyLiked, likes_count: p.likes_count + (isCurrentlyLiked ? -1 : 1) } : p
        ))

        if (isCurrentlyLiked) {
            await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
            await supabase.from('posts').update({ likes_count: post.likes_count - 1 }).eq('id', postId)
        } else {
            await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
            await supabase.from('posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId)
        }
    }

    const handleDelete = async (postId: string) => {
        await supabase.from('posts').delete().eq('id', postId)
        setPosts(posts.filter(p => p.id !== postId))
    }

    const handleComment = async (postId: string, content: string) => {
        if (!user) return

        // Optimistic UI update
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, comments_count: p.comments_count + 1 } : p
        ))

        await supabase.from('comments').insert({ post_id: postId, author_id: user.id, content })

        // Get actual comment count to avoid stale state race conditions
        const { count } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', postId)

        const actualCount = count ?? 0
        await supabase.from('posts').update({ comments_count: actualCount }).eq('id', postId)

        // Sync local state with actual DB count
        setPosts(prev => prev.map(p =>
            p.id === postId ? { ...p, comments_count: actualCount } : p
        ))
    }

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
            <style>{`@media (min-width: 900px) { .feed-grid { grid-template-columns: 1fr 280px !important; } }`}</style>
            <div className="feed-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', alignItems: 'start' }}>
                <div>
                    {/* Page Header */}
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '24px', letterSpacing: '-0.02em' }}>Feed</h1>

                    {/* Create Post */}
                    <div style={{
                        borderRadius: '16px', padding: '16px 20px', marginBottom: '24px',
                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{
                                width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: profile?.avatar_url
                                    ? `url(${profile.avatar_url}) center/cover`
                                    : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                color: 'white', fontSize: '14px', fontWeight: 700,
                            }}>
                                {!profile?.avatar_url && (profile?.full_name?.[0] || 'U')}
                            </div>

                            <div style={{ flex: 1 }}>
                                {showCreatePost ? (
                                    <div>
                                        <textarea
                                            value={newPostContent}
                                            onChange={e => setNewPostContent(e.target.value)}
                                            placeholder="What's on your mind?"
                                            rows={3}
                                            autoFocus
                                            style={{
                                                width: '100%', padding: '12px', borderRadius: '12px', fontSize: '14px',
                                                backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                                color: 'var(--color-text-primary)', resize: 'none', outline: 'none',
                                                fontFamily: 'var(--font-body)', lineHeight: 1.6,
                                            }}
                                        />
                                        {imagePreview && (
                                            <div style={{ position: 'relative', marginTop: '12px', borderRadius: '12px', overflow: 'hidden' }}>
                                                <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '300px', objectFit: 'cover' }} />
                                                <button onClick={() => { setImageFile(null); setImagePreview(null) }} style={{
                                                    position: 'absolute', top: '8px', right: '8px', padding: '6px', borderRadius: '50%',
                                                    backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer'
                                                }}>
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
                                            <div>
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0]
                                                        if (file) {
                                                            setImageFile(file)
                                                            setImagePreview(URL.createObjectURL(file))
                                                        }
                                                    }}
                                                    accept="image/png, image/jpeg, image/webp"
                                                    style={{ display: 'none' }}
                                                />
                                                <button onClick={() => fileInputRef.current?.click()} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                                                    borderRadius: '8px', fontSize: '13px', color: 'var(--color-text-muted)',
                                                    cursor: 'pointer', background: 'none', border: 'none',
                                                }}>
                                                    <ImagePlus size={16} /> Photo
                                                </button>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => { setShowCreatePost(false); setImageFile(null); setImagePreview(null); }} style={{
                                                    padding: '8px 16px', borderRadius: '10px', fontSize: '13px',
                                                    color: 'var(--color-text-muted)', cursor: 'pointer', background: 'none', border: 'none',
                                                }}>Cancel</button>
                                                <button onClick={handleCreatePost} disabled={(!newPostContent.trim() && !imageFile) || posting} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                                                    color: 'white', cursor: 'pointer', border: 'none',
                                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                    opacity: (!newPostContent.trim() && !imageFile) || posting ? 0.5 : 1,
                                                }}>
                                                    {posting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Post
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <button onClick={() => setShowCreatePost(true)} style={{
                                        width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: '10px',
                                        fontSize: '14px', color: 'var(--color-text-muted)', cursor: 'pointer',
                                        backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                    }}>
                                        What&apos;s on your mind?
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Posts */}
                    {loading ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} className="skeleton" style={{
                                    borderRadius: '16px', padding: '20px', height: '140px',
                                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                }} />
                            ))}
                        </div>
                    ) : posts.length === 0 ? (
                        <div style={{
                            textAlign: 'center', padding: '64px 20px', borderRadius: '16px',
                            backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        }}>
                            <div style={{
                                width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                            }}>
                                <MessageCircle size={28} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                                No posts yet
                            </h3>
                            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                                Be the first to share something!
                            </p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {posts.map(post => (
                                <PostCard
                                    key={post.id}
                                    post={post}
                                    currentUserId={user?.id || ''}
                                    onLike={handleLike}
                                    onDelete={handleDelete}
                                    onComment={handleComment}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Suggestions Sidebar */}
                <div className="suggestions-sidebar" style={{ display: 'none' }}>
                    <style>{`.suggestions-sidebar { display: none; } @media (min-width: 900px) { .suggestions-sidebar { display: block !important; } }`}</style>
                    {user && <SuggestionsWidget currentUser={user.id} profile={profile} />}
                </div>
            </div>
        </div>
    )
}
