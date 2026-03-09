'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Profile, Post } from '@/lib/types'
import {
    Edit3, MapPin, GraduationCap, Calendar, UserPlus, UserCheck, Loader2, X, Save, Share2, MessageCircle, Check
} from 'lucide-react'

export default function ProfilePage() {
    const params = useParams()
    const router = useRouter()
    const profileId = params.id as string
    const { user, refreshProfile, loading: authLoading } = useAuth()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [posts, setPosts] = useState<(Post & { author: Profile })[]>([])
    const [loading, setLoading] = useState(true)
    const [isOwnProfile, setIsOwnProfile] = useState(false)
    const [isFollowing, setIsFollowing] = useState(false)
    const [followersCount, setFollowersCount] = useState(0)
    const [followingCount, setFollowingCount] = useState(0)
    const [editing, setEditing] = useState(false)
    const [editData, setEditData] = useState({ full_name: '', display_name: '', bio: '', university: '', department: '', year: '', skills: '', interests: '' })
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [startingDM, setStartingDM] = useState(false)
    const [showFollowersModal, setShowFollowersModal] = useState<'followers' | 'following' | null>(null)
    const [followersList, setFollowersList] = useState<Profile[]>([])
    const [loadingList, setLoadingList] = useState(false)
    const supabase = createClient()

    const fetchProfile = useCallback(async () => {
        try {
            // Run ALL queries in parallel for instant loading
            const queries: any[] = [
                supabase.from('profiles').select('*').eq('id', profileId).single(),
                supabase.from('posts').select('*, author:profiles(*)').eq('author_id', profileId).order('created_at', { ascending: false }).limit(20),
                supabase.from('followers').select('*', { count: 'exact', head: true }).eq('following_id', profileId),
                supabase.from('followers').select('*', { count: 'exact', head: true }).eq('follower_id', profileId),
            ]
            if (user && user.id !== profileId) {
                queries.push(supabase.from('followers').select('id').eq('follower_id', user.id).eq('following_id', profileId).single())
            }

            const results = await Promise.all(queries) as { data: unknown; count?: number | null }[]

            const profileData = results[0].data as Profile | null
            const userPosts = results[1].data as (Post & { author: Profile })[] | null
            const followersCount = results[2].count
            const followingCount = results[3].count

            if (profileData) {
                setProfile(profileData)
                setIsOwnProfile(user?.id === profileId)
                setEditData({
                    full_name: profileData.full_name || '',
                    display_name: profileData.display_name || '',
                    bio: profileData.bio || '',
                    university: profileData.university || '',
                    department: profileData.department || '',
                    year: profileData.year || '',
                    skills: (profileData.skills || []).join(', '),
                    interests: (profileData.interests || []).join(', '),
                })
            }

            if (userPosts) setPosts(userPosts)
            setFollowersCount(followersCount || 0)
            setFollowingCount(followingCount || 0)

            if (user && user.id !== profileId && results[4]) {
                setIsFollowing(!!results[4].data)
            }
        } catch (e) {
            console.error('Failed to fetch profile:', e)
        } finally {
            setLoading(false)
        }
    }, [profileId, user])

    useEffect(() => {
        if (!authLoading) fetchProfile()
    }, [fetchProfile, authLoading])

    const handleFollow = async () => {
        if (!user) return
        if (isFollowing) {
            await supabase.from('followers').delete().eq('follower_id', user.id).eq('following_id', profileId)
            setIsFollowing(false)
            setFollowersCount(prev => prev - 1)
        } else {
            await supabase.from('followers').insert({ follower_id: user.id, following_id: profileId })
            setIsFollowing(true)
            setFollowersCount(prev => prev + 1)
        }
    }

    const handleSaveProfile = async () => {
        if (!user) return
        setSaving(true)
        await supabase.from('profiles').update({
            full_name: editData.full_name,
            display_name: editData.display_name,
            bio: editData.bio,
            university: editData.university,
            department: editData.department,
            year: editData.year,
            skills: editData.skills.split(',').map(s => s.trim()).filter(Boolean),
            interests: editData.interests.split(',').map(s => s.trim()).filter(Boolean),
        }).eq('id', user.id)
        setEditing(false)
        setSaving(false)
        await refreshProfile()
        fetchProfile()
    }

    const handleShare = () => {
        navigator.clipboard.writeText(`${window.location.origin}/profile/${profileId}`)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleStartDM = async () => {
        if (!user) return
        setStartingDM(true)
        try {
            const res = await fetch('/api/start-conversation', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: profileId }),
            })
            const data = await res.json()
            if (data.conversationId) {
                router.push(`/messages?convo=${data.conversationId}`)
            }
        } catch (e) {
            console.error('Failed to start conversation:', e)
        }
        setStartingDM(false)
    }

    const openFollowList = async (type: 'followers' | 'following') => {
        setShowFollowersModal(type)
        setLoadingList(true)
        if (type === 'followers') {
            const { data } = await supabase.from('followers').select('follower_id, profile:profiles!followers_follower_id_fkey(*)').eq('following_id', profileId)
            setFollowersList(data?.map((d: Record<string, unknown>) => d.profile as Profile) || [])
        } else {
            const { data } = await supabase.from('followers').select('following_id, profile:profiles!followers_following_id_fkey(*)').eq('follower_id', profileId)
            setFollowersList(data?.map((d: Record<string, unknown>) => d.profile as Profile) || [])
        }
        setLoadingList(false)
    }

    if (loading) return (
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="skeleton" style={{ height: '240px', borderRadius: '32px' }} />
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', padding: '0 32px', marginTop: '-64px' }}>
                <div className="skeleton" style={{ width: '128px', height: '128px', borderRadius: '50%', border: '6px solid var(--color-bg-primary)' }} />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
                    <div className="skeleton" style={{ width: '200px', height: '28px', borderRadius: '8px' }} />
                    <div className="skeleton" style={{ width: '300px', height: '16px', borderRadius: '8px' }} />
                </div>
            </div>
        </div>
    )

    if (!profile) return (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
            <p style={{ fontSize: '15px', color: 'var(--color-text-muted)' }}>Profile not found</p>
        </div>
    )

    return (
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ position: 'relative' }}>
                {/* Cover */}
                <div style={{
                    height: '240px', borderRadius: '32px', position: 'relative', overflow: 'hidden',
                    background: profile.cover_url ? `url(${profile.cover_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
                }} />

                {/* Profile Info */}
                <div className="profile-info-container" style={{
                    display: 'flex', alignItems: 'flex-start', gap: '24px', padding: '0 32px', marginTop: '-64px', position: 'relative', zIndex: 10
                }}>
                    <div style={{
                        width: '144px', height: '144px', borderRadius: '50%', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '48px', fontWeight: 800,
                        background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                        border: '6px solid var(--color-bg-primary)', color: 'white',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}>
                        {!profile.avatar_url && (profile.full_name?.[0] || 'U')}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, paddingTop: '76px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                            <div>
                                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    {profile.full_name}
                                    {profile.is_verified && (
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                            width: '20px', height: '20px', borderRadius: '50%', backgroundColor: 'var(--color-primary)',
                                            color: 'white', fontSize: '12px'
                                        }} title="Verified">✓</span>
                                    )}
                                </h1>
                                {profile.username && (
                                    <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: 0, fontWeight: 500 }}>
                                        @{profile.username}
                                    </p>
                                )}
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {isOwnProfile ? (
                                    <button
                                        onClick={() => setEditing(!editing)}
                                        className="hover-lift"
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '16px',
                                            fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)',
                                            backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                            cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                    >
                                        <Edit3 size={16} /> Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleFollow}
                                            className="hover-lift"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', borderRadius: '16px',
                                                fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
                                                background: isFollowing ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                color: isFollowing ? 'var(--color-text-secondary)' : 'white',
                                                border: isFollowing ? '1px solid var(--color-border)' : 'none',
                                                boxShadow: isFollowing ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)'
                                            }}
                                        >
                                            {isFollowing ? <><UserCheck size={16} /> Following</> : <><UserPlus size={16} /> Follow</>}
                                        </button>
                                        <button
                                            onClick={handleStartDM}
                                            disabled={startingDM}
                                            className="hover-lift"
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', borderRadius: '16px',
                                                fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)',
                                                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                                cursor: startingDM ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
                                            }}
                                        >
                                            {startingDM ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Message
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={handleShare}
                                    className="hover-lift"
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '16px',
                                        fontSize: '14px', fontWeight: 600, color: copied ? 'var(--color-success)' : 'var(--color-text-muted)',
                                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                        cursor: 'pointer', transition: 'all 0.2s',
                                    }}
                                >
                                    {copied ? <><Check size={16} /> Copied!</> : <><Share2 size={16} /> Share</>}
                                </button>
                            </div>
                        </div>

                        {profile.bio && (
                            <p style={{ fontSize: '15px', lineHeight: 1.6, color: 'var(--color-text-primary)', margin: '16px 0 0 0' }}>
                                {profile.bio}
                            </p>
                        )}

                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '20px', marginTop: '20px' }}>
                            {profile.university && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                    <GraduationCap size={16} style={{ color: 'var(--color-text-muted)' }} /> {profile.university}
                                </span>
                            )}
                            {profile.department && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                    <MapPin size={16} style={{ color: 'var(--color-text-muted)' }} /> {profile.department}
                                </span>
                            )}
                            {profile.year && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>
                                    <Calendar size={16} style={{ color: 'var(--color-text-muted)' }} /> {profile.year}
                                </span>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '32px', marginTop: '24px', paddingTop: '24px', borderTop: '1px solid var(--color-border)' }}>
                            <button onClick={() => openFollowList('followers')} style={{ display: 'flex', flexDirection: 'column', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}>
                                <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{followersCount}</span>
                                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Followers</span>
                            </button>
                            <button onClick={() => openFollowList('following')} style={{ display: 'flex', flexDirection: 'column', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}>
                                <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{followingCount}</span>
                                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Following</span>
                            </button>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-display)' }}>{posts.length}</span>
                                <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', fontWeight: 500 }}>Posts</span>
                            </div>
                        </div>

                        {/* Tags */}
                        {(profile.skills?.length > 0 || profile.interests?.length > 0) && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '24px' }}>
                                {[...(profile.skills || []), ...(profile.interests || [])].map(tag => (
                                    <span key={tag} style={{
                                        padding: '6px 14px', borderRadius: '99px', fontSize: '13px', fontWeight: 600,
                                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)',
                                        border: '1px solid var(--color-border)'
                                    }}>
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Form */}
            {editing && (
                <div className="animate-scale-in" style={{
                    borderRadius: '24px', padding: '32px', backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: 0 }}>
                            Edit Profile
                        </h3>
                        <button
                            onClick={() => setEditing(false)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                        {Object.entries(editData).map(([key, val]) => (
                            <div key={key} style={{ gridColumn: key === 'bio' ? '1 / -1' : 'auto' }}>
                                <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px', display: 'block', textTransform: 'capitalize' }}>
                                    {key.replace('_', ' ')}
                                </label>
                                {key === 'bio' ? (
                                    <textarea
                                        value={val}
                                        onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                                        rows={3}
                                        style={{
                                            width: '100%', padding: '14px 16px', borderRadius: '16px', fontSize: '14px', resize: 'none', fontFamily: 'var(--font-body)',
                                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none'
                                        }}
                                    />
                                ) : (
                                    <input
                                        type="text"
                                        value={val}
                                        onChange={e => setEditData({ ...editData, [key]: e.target.value })}
                                        placeholder={key === 'skills' || key === 'interests' ? 'Comma separated, e.g. React, Next.js' : ''}
                                        style={{
                                            width: '100%', padding: '14px 16px', borderRadius: '16px', fontSize: '14px',
                                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', outline: 'none'
                                        }}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px' }}>
                        <button
                            onClick={() => setEditing(false)}
                            style={{
                                padding: '12px 24px', borderRadius: '16px', fontSize: '14px', fontWeight: 600,
                                backgroundColor: 'transparent', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="hover-lift"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 32px', borderRadius: '16px',
                                fontSize: '14px', fontWeight: 600, color: 'white', border: 'none',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                                boxShadow: '0 4px 15px rgba(99, 102, 241, 0.3)'
                            }}
                        >
                            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
                        </button>
                    </div>
                </div>
            )}

            {/* Posts */}
            <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700, margin: '0 0 20px 0' }}>
                    Recent Activity
                </h2>
                {posts.length === 0 ? (
                    <div style={{
                        textAlign: 'center', padding: '64px 20px', borderRadius: '24px',
                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)'
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '12px', margin: '0 auto 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)'
                        }}>
                            <Edit3 size={24} />
                        </div>
                        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)', margin: '0 0 4px 0' }}>
                            No posts yet
                        </p>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>
                            When {profile.full_name?.split(' ')[0] || 'they'} posts, it will show up here.
                        </p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {posts.map(post => (
                            <div key={post.id} style={{
                                borderRadius: '24px', padding: '24px', backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border)', transition: 'all 0.2s',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '50%',
                                        background: profile.avatar_url ? `url(${profile.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '14px', fontWeight: 600
                                    }}>
                                        {!profile.avatar_url && (profile.full_name?.[0] || 'U')}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                                            {profile.full_name}
                                        </p>
                                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                                            {new Date(post.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>

                                <p style={{ fontSize: '15px', color: 'var(--color-text-primary)', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-wrap' }}>
                                    {post.content}
                                </p>
                                {post.image_url && (
                                    <div style={{ marginTop: '16px', borderRadius: '16px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
                                        <img src={post.image_url} alt="" style={{ width: '100%', display: 'block', maxHeight: '500px', objectFit: 'cover' }} />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Followers/Following Modal */}
            {showFollowersModal && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', padding: '20px',
                }} onClick={() => setShowFollowersModal(null)}>
                    <div className="animate-scale-in" onClick={e => e.stopPropagation()} style={{
                        width: '100%', maxWidth: '420px', maxHeight: '70vh', borderRadius: '24px',
                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', display: 'flex', flexDirection: 'column', overflow: 'hidden',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--color-border)' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 700, margin: 0, textTransform: 'capitalize' }}>
                                {showFollowersModal}
                            </h3>
                            <button onClick={() => setShowFollowersModal(null)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
                            {loadingList ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
                                    <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                                </div>
                            ) : followersList.length === 0 ? (
                                <p style={{ textAlign: 'center', padding: '40px', fontSize: '14px', color: 'var(--color-text-muted)' }}>
                                    No {showFollowersModal} yet
                                </p>
                            ) : (
                                followersList.map(p => (
                                    <a
                                        key={p.id}
                                        href={`/profile/${p.id}`}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 24px',
                                            textDecoration: 'none', color: 'inherit', transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)'}
                                        onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                    >
                                        <div style={{
                                            width: '44px', height: '44px', borderRadius: '50%', flexShrink: 0,
                                            background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontSize: '16px', fontWeight: 700,
                                        }}>
                                            {!p.avatar_url && (p.full_name?.[0] || '?')}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: '14px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {p.full_name || 'Student'}
                                            </p>
                                            {p.username && (
                                                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>@{p.username}</p>
                                            )}
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @media (max-width: 640px) {
          .profile-info-container {
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 0 20px !important;
          }
          .profile-info-container > div:last-child {
            padding-top: 20px !important;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
        </div>
    )
}
