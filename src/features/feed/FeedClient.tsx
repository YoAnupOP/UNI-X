'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Heart, ImagePlus, Loader2, MessageCircle, Send, Share2, Trash2, UserPlus, X } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Profile } from '@/lib/types'
import { uploadImage } from '@/lib/upload'
import { fetchJson } from '@/lib/query/fetch-json'
import type { FeedComment, FeedPost } from './server'

const FEED_POSTS_QUERY_KEY = ['feed-posts'] as const
const FEED_SUGGESTIONS_QUERY_KEY = ['feed-suggestions'] as const
const feedCommentsQueryKey = (postId: string) => ['feed-comments', postId] as const

function timeAgo(date: string, now: number) {
    const seconds = Math.max(0, Math.floor((now - new Date(date).getTime()) / 1000))
    if (seconds < 60) return 'just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
}

function PostCard({ post, currentUserId, onLike, onDelete, onComment, now }: {
    post: FeedPost
    currentUserId: string
    onLike: (postId: string) => void
    onDelete: (postId: string) => void
    onComment: (postId: string, content: string) => Promise<void>
    now: number
}) {
    const [showComments, setShowComments] = useState(false)
    const [commentText, setCommentText] = useState('')
    const [copied, setCopied] = useState(false)

    const commentsQuery = useQuery({
        queryKey: feedCommentsQueryKey(post.id),
        queryFn: () => fetchJson<FeedComment[]>(`/api/feed/comments?postId=${post.id}`, { cache: 'no-store' }),
        enabled: showComments,
        staleTime: 60_000,
    })

    const handleShare = async () => {
        await navigator.clipboard.writeText(`${window.location.origin}/feed?post=${post.id}`)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1500)
    }

    return (
        <article style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <div style={{ display: 'flex', gap: '12px', minWidth: 0 }}>
                    <div style={{
                        width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                        background: post.author.avatar_url ? `url(${post.author.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700,
                    }}>
                        {!post.author.avatar_url && (post.author.full_name?.[0] || 'U')}
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{post.author.full_name || 'Unknown'}</div>
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>@{post.author.username || 'student'} · {timeAgo(post.created_at, now)}</div>
                    </div>
                </div>
                {post.author_id === currentUserId && (
                    <button onClick={() => onDelete(post.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#F87171' }}>
                        <Trash2 size={16} />
                    </button>
                )}
            </div>

            <div style={{ marginTop: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{post.content}</div>

            {post.image_url && (
                <img src={post.image_url} alt="" style={{ width: '100%', marginTop: '14px', borderRadius: '16px', maxHeight: '420px', objectFit: 'cover' }} />
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap' }}>
                <button onClick={() => onLike(post.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: post.is_liked ? '#F87171' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Heart size={16} fill={post.is_liked ? 'currentColor' : 'none'} /> {post.likes_count}
                </button>
                <button onClick={() => setShowComments((prev) => !prev)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MessageCircle size={16} /> {post.comments_count}
                </button>
                <button onClick={() => void handleShare()} style={{ border: 'none', background: 'none', cursor: 'pointer', color: copied ? 'var(--color-success)' : 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {copied ? <Check size={16} /> : <Share2 size={16} />} {copied ? 'Copied' : 'Share'}
                </button>
            </div>

            {showComments && (
                <div style={{ marginTop: '16px', borderTop: '1px solid var(--color-border)', paddingTop: '16px' }}>
                    {commentsQuery.isLoading ? (
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>Loading comments...</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {(commentsQuery.data ?? []).map((comment) => (
                                <div key={comment.id} style={{ fontSize: '13px' }}>
                                    <strong>{comment.author.full_name}</strong>
                                    <span style={{ color: 'var(--color-text-muted)' }}> · {timeAgo(comment.created_at, now)}</span>
                                    <div style={{ marginTop: '3px', color: 'var(--color-text-secondary)' }}>{comment.content}</div>
                                </div>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <input
                            value={commentText}
                            onChange={(event) => setCommentText(event.target.value)}
                            placeholder="Write a comment..."
                            style={{ flex: 1, padding: '10px 12px', borderRadius: '12px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', outline: 'none', color: 'var(--color-text-primary)' }}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' && commentText.trim()) {
                                    void onComment(post.id, commentText).then(() => setCommentText(''))
                                }
                            }}
                        />
                        <button onClick={() => void onComment(post.id, commentText).then(() => setCommentText(''))} style={{ border: 'none', borderRadius: '12px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', padding: '0 14px', cursor: 'pointer' }}>
                            <Send size={16} />
                        </button>
                    </div>
                </div>
            )}
        </article>
    )
}

export default function FeedClient({ initialPosts, initialSuggestions, renderedAt }: { initialPosts: FeedPost[]; initialSuggestions: Profile[]; renderedAt: number }) {
    const { user, profile } = useAuth()
    const queryClient = useQueryClient()
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [composerOpen, setComposerOpen] = useState(false)
    const [content, setContent] = useState('')
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [now, setNow] = useState(renderedAt)

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setNow(Date.now())
        }, 1_000)

        const intervalId = window.setInterval(() => {
            setNow(Date.now())
        }, 60_000)

        return () => {
            window.clearTimeout(timeoutId)
            window.clearInterval(intervalId)
        }
    }, [])

    const postsQuery = useQuery({
        queryKey: FEED_POSTS_QUERY_KEY,
        queryFn: () => fetchJson<FeedPost[]>('/api/feed', { cache: 'no-store' }),
        initialData: initialPosts,
        staleTime: 60_000,
    })

    const suggestionsQuery = useQuery({
        queryKey: FEED_SUGGESTIONS_QUERY_KEY,
        queryFn: () => fetchJson<Profile[]>('/api/feed/suggestions', { cache: 'no-store' }),
        initialData: initialSuggestions,
        staleTime: 300_000,
        enabled: Boolean(user),
    })

    const createPostMutation = useMutation({
        mutationFn: (payload: { content: string; imageUrl?: string | null }) => fetchJson<FeedPost>('/api/feed', { method: 'POST', body: JSON.stringify(payload) }),
        onSuccess: (post) => {
            queryClient.setQueryData(FEED_POSTS_QUERY_KEY, (current: FeedPost[] | undefined) => [post, ...(current ?? [])])
            setContent('')
            setImageFile(null)
            setImagePreview(null)
            setComposerOpen(false)
        },
    })

    const likeMutation = useMutation({
        mutationFn: (postId: string) => fetchJson<{ postId: string; likesCount: number; isLiked: boolean }>('/api/feed', { method: 'PATCH', body: JSON.stringify({ postId }) }),
        onMutate: async (postId) => {
            const previous = queryClient.getQueryData<FeedPost[]>(FEED_POSTS_QUERY_KEY) ?? []
            queryClient.setQueryData(FEED_POSTS_QUERY_KEY, previous.map((post) => post.id === postId ? { ...post, is_liked: !post.is_liked, likes_count: post.likes_count + (post.is_liked ? -1 : 1) } : post))
            return { previous }
        },
        onError: (_error, _postId, context) => {
            if (context?.previous) queryClient.setQueryData(FEED_POSTS_QUERY_KEY, context.previous)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: (postId: string) => fetchJson<{ success: boolean }>('/api/feed', { method: 'DELETE', body: JSON.stringify({ postId }) }),
        onMutate: async (postId) => {
            const previous = queryClient.getQueryData<FeedPost[]>(FEED_POSTS_QUERY_KEY) ?? []
            queryClient.setQueryData(FEED_POSTS_QUERY_KEY, previous.filter((post) => post.id !== postId))
            return { previous }
        },
        onError: (_error, _postId, context) => {
            if (context?.previous) queryClient.setQueryData(FEED_POSTS_QUERY_KEY, context.previous)
        },
    })

    const commentMutation = useMutation({
        mutationFn: ({ postId, content }: { postId: string; content: string }) => fetchJson<{ comment: FeedComment; commentsCount: number }>('/api/feed/comments', { method: 'POST', body: JSON.stringify({ postId, content }) }),
        onSuccess: (result, variables) => {
            queryClient.setQueryData(FEED_POSTS_QUERY_KEY, (current: FeedPost[] | undefined) => (current ?? []).map((post) => post.id === variables.postId ? { ...post, comments_count: result.commentsCount } : post))
            queryClient.setQueryData(feedCommentsQueryKey(variables.postId), (current: FeedComment[] | undefined) => [...(current ?? []), result.comment])
        },
    })

    const followMutation = useMutation({
        mutationFn: (profileId: string) => fetchJson<{ profileId: string; isFollowing: boolean }>('/api/feed/suggestions', { method: 'POST', body: JSON.stringify({ profileId }) }),
        onSuccess: (result) => {
            if (result.isFollowing) {
                queryClient.setQueryData(FEED_SUGGESTIONS_QUERY_KEY, (current: Profile[] | undefined) => (current ?? []).filter((item) => item.id !== result.profileId))
            }
        },
    })

    const handleCreatePost = async () => {
        if ((!content.trim() && !imageFile) || !user) return
        let imageUrl: string | null = null
        if (imageFile) {
            imageUrl = await uploadImage(imageFile, 'uploads')
        }
        createPostMutation.mutate({ content, imageUrl })
    }

    const posts = postsQuery.data ?? []
    const suggestions = suggestionsQuery.data ?? []

    return (
        <div style={{ maxWidth: '1080px', margin: '0 auto', display: 'grid', gap: '24px' }}>
            <div style={{ display: 'grid', gap: '24px' }} className="feed-layout">
                <section>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, marginBottom: '18px' }}>Feed</h1>
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '18px', marginBottom: '20px' }}>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                width: '42px', height: '42px', borderRadius: '12px', flexShrink: 0,
                                background: profile?.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700,
                            }}>
                                {!profile?.avatar_url && (profile?.full_name?.[0] || 'U')}
                            </div>
                            <div style={{ flex: 1 }}>
                                {!composerOpen ? (
                                    <button onClick={() => setComposerOpen(true)} style={{ width: '100%', textAlign: 'left', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
                                        What&apos;s on your mind?
                                    </button>
                                ) : (
                                    <div style={{ display: 'grid', gap: '12px' }}>
                                        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={3} placeholder="Share something with UNI-X" style={{ width: '100%', padding: '12px 14px', borderRadius: '14px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', resize: 'vertical', outline: 'none' }} />
                                        {imagePreview && <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', borderRadius: '16px' }} />}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(event) => {
                                                    const file = event.target.files?.[0]
                                                    if (file) {
                                                        setImageFile(file)
                                                        setImagePreview(URL.createObjectURL(file))
                                                    }
                                                }} />
                                                <button onClick={() => fileInputRef.current?.click()} style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <ImagePlus size={16} /> Photo
                                                </button>
                                                {imagePreview && <button onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ border: '1px solid var(--color-border)', background: 'transparent', color: 'var(--color-text-muted)', borderRadius: '12px', padding: '10px 12px', cursor: 'pointer' }}><X size={16} /></button>}
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => { setComposerOpen(false); setImageFile(null); setImagePreview(null); setContent('') }} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', borderRadius: '12px', padding: '10px 14px', cursor: 'pointer' }}>Cancel</button>
                                                <button onClick={() => void handleCreatePost()} disabled={createPostMutation.isPending || (!content.trim() && !imageFile)} style={{ border: 'none', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', borderRadius: '12px', padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', opacity: createPostMutation.isPending || (!content.trim() && !imageFile) ? 0.6 : 1 }}>
                                                    {createPostMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Post
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gap: '16px' }}>
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                currentUserId={user?.id || ''}
                                onLike={(postId) => likeMutation.mutate(postId)}
                                onDelete={(postId) => deleteMutation.mutate(postId)}
                                onComment={(postId, comment) => commentMutation.mutateAsync({ postId, content: comment }).then(() => undefined)}
                                now={now}
                            />
                        ))}
                        {posts.length === 0 && (
                            <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '32px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                                No posts yet.
                            </div>
                        )}
                    </div>
                </section>

                <aside style={{ display: suggestions.length ? 'block' : 'none' }} className="feed-sidebar">
                    <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '24px', padding: '18px', position: 'sticky', top: '96px' }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Suggested for you</h2>
                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '14px' }}>People from UNI-X you may want to connect with.</p>
                        <div style={{ display: 'grid', gap: '10px' }}>
                            {suggestions.map((suggestion) => {
                                const isFollowPending = followMutation.isPending && followMutation.variables === suggestion.id

                                return (
                                    <div
                                        key={suggestion.id}
                                        className="feed-suggestion-row"
                                        style={{
                                            display: 'grid',
                                            gridTemplateColumns: 'minmax(0, 1fr) auto',
                                            alignItems: 'center',
                                            gap: '12px',
                                            padding: '10px',
                                            borderRadius: '16px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                            background: 'rgba(255,255,255,0.02)',
                                        }}
                                    >
                                        <Link href={`/profile/${suggestion.id}`} style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, color: 'inherit', textDecoration: 'none' }}>
                                            <div style={{
                                                width: '42px', height: '42px', borderRadius: '14px', flexShrink: 0,
                                                background: suggestion.avatar_url ? `url(${suggestion.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700,
                                                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.18)',
                                            }}>
                                                {!suggestion.avatar_url && (suggestion.full_name?.[0] || 'U')}
                                            </div>
                                            <div style={{ minWidth: 0 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{suggestion.full_name || 'Student'}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{suggestion.username || 'student'}</div>
                                            </div>
                                        </Link>
                                        <button
                                            onClick={() => followMutation.mutate(suggestion.id)}
                                            disabled={isFollowPending}
                                            style={{
                                                minWidth: '92px',
                                                border: 'none',
                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                color: 'white',
                                                borderRadius: '12px',
                                                padding: '9px 12px',
                                                cursor: isFollowPending ? 'default' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px',
                                                fontSize: '13px',
                                                fontWeight: 700,
                                                boxShadow: '0 12px 24px rgba(72, 187, 255, 0.18)',
                                                opacity: isFollowPending ? 0.75 : 1,
                                            }}
                                        >
                                            {isFollowPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                                            {isFollowPending ? 'Adding' : 'Follow'}
                                        </button>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </aside>
            </div>

            <style>{`
                .feed-layout { grid-template-columns: 1fr; }
                @media (min-width: 980px) {
                    .feed-layout { grid-template-columns: minmax(0, 1fr) 320px; align-items: start; }
                }
                .feed-suggestion-row {
                    transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
                }
                .feed-suggestion-row:hover {
                    transform: translateY(-1px);
                    border-color: rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.035);
                }
            `}</style>
        </div>
    )
}



