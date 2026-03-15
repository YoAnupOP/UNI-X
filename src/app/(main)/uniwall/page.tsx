'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { WallPost, Profile } from '@/lib/types'
import { Heart, Plus, ImagePlus, Loader2, Lock, Globe, X } from 'lucide-react'
import { uploadImage } from '@/lib/upload'
import { useCachedQuery } from '@/lib/useCachedQuery'

export default function UniWallPage() {
    const { user, loading: authLoading } = useAuth()
    const supabase = createClient()
    const [showCreate, setShowCreate] = useState(false)
    const [newPost, setNewPost] = useState({ content: '', visibility: 'public' })
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [creating, setCreating] = useState(false)

    const fetchPostsData = useCallback(async () => {
        const { data } = await supabase
            .from('wall_posts')
            .select('*, author:profiles(*)')
            .order('created_at', { ascending: false })

        if (data && user) {
            const { data: likes } = await supabase.from('wall_likes').select('wall_post_id').eq('user_id', user.id)
            const likedIds = new Set(likes?.map(l => l.wall_post_id))
            return data.map(p => ({ ...p, is_liked: likedIds.has(p.id) })) as (WallPost & { author: Profile })[]
        }
        return (data as (WallPost & { author: Profile })[]) ?? null
    }, [user, supabase])

    const { data: posts, setData: setPosts, isLoading: loading, refresh: refreshPosts } = useCachedQuery(
        'uniwall-posts',
        fetchPostsData,
        [] as (WallPost & { author: Profile })[],
        { enabled: !authLoading }
    )

    const handleLike = async (postId: string) => {
        if (!user) return
        const post = posts.find(p => p.id === postId)
        if (!post) return

        const wasLiked = post.is_liked
        const newLiked = !wasLiked
        const countDelta = newLiked ? 1 : -1

        // Optimistic update — instant UI response
        setPosts(prev => prev.map(p => p.id === postId
            ? { ...p, is_liked: newLiked, likes_count: p.likes_count + countDelta }
            : p
        ))

        try {
            if (wasLiked) {
                await supabase.from('wall_likes').delete().eq('wall_post_id', postId).eq('user_id', user.id)
                await supabase.from('wall_posts').update({ likes_count: post.likes_count - 1 }).eq('id', postId)
            } else {
                await supabase.from('wall_likes').insert({ wall_post_id: postId, user_id: user.id })
                await supabase.from('wall_posts').update({ likes_count: post.likes_count + 1 }).eq('id', postId)
            }
        } catch {
            // Rollback on failure
            setPosts(prev => prev.map(p => p.id === postId
                ? { ...p, is_liked: wasLiked, likes_count: post.likes_count }
                : p
            ))
        }
    }

    const handleCreate = async () => {
        if (!user || !imageFile) return
        setCreating(true)

        let imageUrl = null
        try {
            imageUrl = await uploadImage(imageFile, 'uploads')
        } catch (err) {
            console.error(err)
            setCreating(false)
            alert('Image upload failed. Please ensure the "uploads" bucket exists.')
            return
        }

        await supabase.from('wall_posts').insert({
            author_id: user.id,
            content: newPost.content,
            image_url: imageUrl,
            visibility: newPost.visibility,
        })
        setNewPost({ content: '', visibility: 'public' })
        setImageFile(null)
        setImagePreview(null)
        setShowCreate(false)
        setCreating(false)
        refreshPosts(true)
    }

    return (
        <div style={{ maxWidth: '1024px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, margin: '0 0 4px 0' }}>
                        UniWall
                    </h1>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                        Campus memories & achievements
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="hover-lift"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px',
                        borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white',
                        background: 'var(--color-primary)',
                        border: 'none', cursor: 'pointer',
                    }}
                >
                    <Plus size={18} /> Share
                </button>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '20px'
                }}>
                    <div className="animate-scale-in" style={{
                        width: '100%', maxWidth: '448px', borderRadius: '24px', padding: '24px',
                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, margin: 0 }}>
                                Share a Memory
                            </h3>
                            <button
                                onClick={() => setShowCreate(false)}
                                style={{
                                    background: 'none', border: 'none', color: 'var(--color-text-muted)',
                                    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div style={{
                            border: '2px dashed var(--color-border)', borderRadius: '12px', padding: '24px', textAlign: 'center',
                            cursor: 'pointer', backgroundColor: 'var(--color-bg-elevated)', position: 'relative', overflow: 'hidden'
                        }}
                            onClick={() => !imagePreview && fileInputRef.current?.click()}
                        >
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
                            {imagePreview ? (
                                <div style={{ position: 'relative', width: '100%', height: '200px', borderRadius: '8px', overflow: 'hidden' }}>
                                    <img src={imagePreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button onClick={(e) => { e.stopPropagation(); setImageFile(null); setImagePreview(null); }} style={{
                                        position: 'absolute', top: '8px', right: '8px', padding: '6px', borderRadius: '50%',
                                        backgroundColor: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', cursor: 'pointer'
                                    }}>
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)' }}>
                                    <ImagePlus size={32} />
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500 }}>Click to upload an image</p>
                                </div>
                            )}
                        </div>

                        <textarea
                            value={newPost.content}
                            onChange={e => setNewPost({ ...newPost, content: e.target.value })}
                            placeholder="Caption (optional)" rows={3}
                            style={{
                                width: '100%', padding: '14px 16px', borderRadius: '12px', fontSize: '14px',
                                backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                color: 'var(--color-text-primary)', resize: 'none', outline: 'none', fontFamily: 'var(--font-body)'
                            }}
                        />

                        <div style={{ display: 'flex', gap: '8px' }}>
                            {['public', 'private'].map(v => (
                                <button
                                    key={v}
                                    onClick={() => setNewPost({ ...newPost, visibility: v })}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px',
                                        fontSize: '13px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s',
                                        backgroundColor: newPost.visibility === v ? 'var(--color-primary-light)' : 'var(--color-bg-elevated)',
                                        color: newPost.visibility === v ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                        border: '1px solid', borderColor: newPost.visibility === v ? 'transparent' : 'var(--color-border)',
                                    }}
                                >
                                    {v === 'public' ? <Globe size={14} /> : <Lock size={14} />}
                                    {v.charAt(0).toUpperCase() + v.slice(1)}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={handleCreate}
                            disabled={creating || !imageFile}
                            className="hover-lift"
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 600, color: 'white',
                                background: 'var(--color-primary)',
                                border: 'none', cursor: (creating || !imageFile) ? 'not-allowed' : 'pointer',
                                opacity: (creating || !imageFile) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}
                        >
                            {creating ? <Loader2 size={18} className="animate-spin" /> : 'Share to Wall'}
                        </button>
                    </div>
                </div>
            )}

            {/* Wall Grid using pure CSS columns (Masonry layout) */}
            {loading ? (
                <div className="masonry-grid" style={{ marginBottom: '40px' }}>
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="masonry-item skeleton" style={{
                            borderRadius: '20px', height: `${150 + (i % 3) * 80}px`
                        }} />
                    ))}
                </div>
            ) : posts.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '64px 20px', borderRadius: '24px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)',
                    }}>
                        <ImagePlus size={32} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 600, margin: '0 0 8px 0' }}>
                        The wall is empty
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                        Be the first to share a memory!
                    </p>
                </div>
            ) : (
                <div className="masonry-grid" style={{ marginBottom: '40px' }}>
                    {posts.map(post => (
                        <div key={post.id} className="masonry-item hover-lift" style={{
                            borderRadius: '20px', overflow: 'hidden', position: 'relative',
                            backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                            transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}>
                            <div style={{ position: 'relative' }}>
                                <img
                                    src={post.image_url} alt=""
                                    style={{ width: '100%', display: 'block', minHeight: '150px', backgroundColor: 'var(--color-bg-elevated)' }}
                                    onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found' }}
                                />

                                {/* Author Overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent 50%)',
                                    display: 'flex', alignItems: 'flex-end', padding: '16px', opacity: 0, transition: 'opacity 0.2s',
                                }} onMouseEnter={(e) => e.currentTarget.style.opacity = '1'} onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}>
                                    <p style={{ color: 'white', fontSize: '14px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {post.author?.full_name || 'Anonymous'}
                                    </p>
                                </div>
                            </div>

                            {post.content && (
                                <div style={{ padding: '16px 16px 8px' }}>
                                    <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
                                        {post.content}
                                    </p>
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{
                                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                borderTop: post.content ? 'none' : '1px solid var(--color-border)'
                            }}>
                                <button
                                    onClick={() => handleLike(post.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600,
                                        color: post.is_liked ? 'var(--color-error)' : 'var(--color-text-muted)',
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s'
                                    }}
                                    onMouseEnter={(e) => { if (!post.is_liked) e.currentTarget.style.color = 'var(--color-error)' }}
                                    onMouseLeave={(e) => { if (!post.is_liked) e.currentTarget.style.color = 'var(--color-text-muted)' }}
                                >
                                    <Heart size={16} fill={post.is_liked ? 'currentColor' : 'none'} style={{ transition: 'transform 0.2s' }} />
                                    {post.likes_count}
                                </button>
                                {post.visibility === 'private' && (
                                    <Lock size={14} style={{ color: 'var(--color-text-muted)' }} />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Masonry layout CSS */}
            <style>{`
        .masonry-grid {
          column-count: 1;
          column-gap: 16px;
        }
        .masonry-item {
          break-inside: avoid;
          margin-bottom: 16px;
        }
        @media (min-width: 640px) {
          .masonry-grid { column-count: 2; }
        }
        @media (min-width: 1024px) {
          .masonry-grid { column-count: 3; }
        }
      `}</style>
        </div>
    )
}
