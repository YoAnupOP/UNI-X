'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Profile } from '@/lib/types'
import { Heart, X, Sparkles, MessageCircle, Loader2, RefreshCw, GraduationCap, MapPin, ArrowLeft, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getStaleCache, setCache, isCacheFresh } from '@/lib/cache'

export default function SwipeXPage() {
    const { user, profile: myProfile, loading: authLoading } = useAuth()
    const [candidates, setCandidates] = useState<Profile[]>(() => getStaleCache('swipex-candidates') || [])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [loading, setLoading] = useState(() => !getStaleCache('swipex-candidates'))
    const [showMatch, setShowMatch] = useState<Profile | null>(null)
    const [swiping, setSwiping] = useState(false)
    const supabase = createClient()

    // Drag state
    const cardRef = useRef<HTMLDivElement>(null)
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [flyOff, setFlyOff] = useState<'left' | 'right' | null>(null)

    const fetchCandidates = useCallback(async (skipIfFresh = false) => {
        if (!user) { setLoading(false); return }
        if (skipIfFresh && isCacheFresh('swipex-candidates')) { setLoading(false); return }
        setLoading(true)
        try {
            const { data: swiped } = await supabase.from('swipe_actions').select('swiped_id').eq('swiper_id', user.id)
            const swipedIds = swiped?.map(s => s.swiped_id) || []

            let query = supabase.from('profiles').select('*').neq('id', user.id).eq('is_public', true).eq('profile_completed', true).limit(30)
            if (swipedIds.length > 0) {
                query = query.not('id', 'in', `(${swipedIds.join(',')})`)
            }

            const { data } = await query
            setCandidates(data as Profile[] || [])
            setCache('swipex-candidates', data || [])
            setCurrentIndex(0)
        } catch (e) {
            console.error('Failed to fetch candidates:', e)
        } finally {
            setLoading(false)
        }
    }, [user, supabase])

    useEffect(() => {
        if (!authLoading) fetchCandidates(true)
    }, [fetchCandidates, authLoading])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (swiping || !candidates[currentIndex]) return
            if (e.key === 'ArrowLeft') handleSwipe('pass')
            if (e.key === 'ArrowRight') handleSwipe('like')
        }
        window.addEventListener('keydown', handleKey)
        return () => window.removeEventListener('keydown', handleKey)
    })

    const handleSwipe = async (action: 'like' | 'pass') => {
        if (!user || currentIndex >= candidates.length || swiping) return
        const target = candidates[currentIndex]
        setSwiping(true)

        setFlyOff(action === 'like' ? 'right' : 'left')

        await supabase.from('swipe_actions').insert({
            swiper_id: user.id,
            swiped_id: target.id,
            action,
        })

        if (action === 'like') {
            const { data: mutualLike } = await supabase
                .from('swipe_actions')
                .select('id')
                .eq('swiper_id', target.id)
                .eq('swiped_id', user.id)
                .eq('action', 'like')
                .single()

            if (mutualLike) {
                const ids = [user.id, target.id].sort()
                await supabase.from('matches').insert({ user1_id: ids[0], user2_id: ids[1] })
                setTimeout(() => setShowMatch(target), 400)
            }
        }

        setTimeout(() => {
            setFlyOff(null)
            setDragOffset({ x: 0, y: 0 })
            setCurrentIndex(prev => prev + 1)
            setSwiping(false)
        }, 350)
    }

    // Drag handlers
    const onDragStart = (clientX: number, clientY: number) => {
        if (swiping) return
        setDragStart({ x: clientX, y: clientY })
        setIsDragging(true)
    }

    const onDragMove = (clientX: number, clientY: number) => {
        if (!dragStart || !isDragging) return
        setDragOffset({ x: clientX - dragStart.x, y: (clientY - dragStart.y) * 0.3 })
    }

    const onDragEnd = () => {
        if (!isDragging) return
        setIsDragging(false)
        setDragStart(null)

        if (Math.abs(dragOffset.x) > 120) {
            handleSwipe(dragOffset.x > 0 ? 'like' : 'pass')
        } else {
            setDragOffset({ x: 0, y: 0 })
        }
    }

    const current = candidates[currentIndex]
    const next = candidates[currentIndex + 1]
    const rotation = isDragging ? dragOffset.x * 0.08 : 0
    const likeOpacity = Math.min(Math.max(dragOffset.x / 150, 0), 1)
    const passOpacity = Math.min(Math.max(-dragOffset.x / 150, 0), 1)

    const getCardTransform = () => {
        if (flyOff === 'left') return 'translateX(-150vw) rotate(-30deg)'
        if (flyOff === 'right') return 'translateX(150vw) rotate(30deg)'
        if (isDragging) return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
        return 'translate(0, 0) rotate(0deg)'
    }

    return (
        <div style={{ maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <h1 className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                        SwipeX
                    </h1>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '2px 0 0 0' }}>
                        Discover & connect with students
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '4px 10px', borderRadius: '8px', backgroundColor: 'var(--color-bg-elevated)' }}>
                        ← → to swipe
                    </span>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 0', gap: '16px' }}>
                    <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Finding people for you...</p>
                </div>
            ) : !current ? (
                <div style={{
                    textAlign: 'center', padding: '80px 24px', borderRadius: '28px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', margin: '0 auto 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(56,189,248,0.15))',
                    }}>
                        <Sparkles size={36} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, margin: '0 0 8px 0' }}>
                        All caught up!
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '0 0 28px 0', lineHeight: 1.6 }}>
                        You&apos;ve seen everyone available right now.<br />Check back later for new faces!
                    </p>
                    <button
                        onClick={() => fetchCandidates()}
                        className="hover-lift"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '14px 28px',
                            borderRadius: '16px', fontSize: '15px', fontWeight: 600, color: 'white',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            border: 'none', cursor: 'pointer', boxShadow: '0 4px 20px rgba(139,92,246,0.3)',
                        }}
                    >
                        <RefreshCw size={18} /> Refresh
                    </button>
                </div>
            ) : (
                <>
                    {/* Card Stack */}
                    <div style={{ position: 'relative', height: '520px', perspective: '1000px' }}>
                        {/* Background card (next) */}
                        {next && (
                            <div style={{
                                position: 'absolute', inset: 0, borderRadius: '28px', overflow: 'hidden',
                                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                transform: `scale(${0.95 + Math.min(Math.abs(dragOffset.x) / 1500, 0.05)})`,
                                opacity: 0.6 + Math.min(Math.abs(dragOffset.x) / 400, 0.4),
                                transition: isDragging ? 'none' : 'all 0.3s ease',
                            }}>
                                <div style={{
                                    height: '60%', width: '100%',
                                    background: next.avatar_url ? `url(${next.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-secondary), var(--color-accent))',
                                }} />
                            </div>
                        )}

                        {/* Main Card */}
                        <div
                            ref={cardRef}
                            onMouseDown={e => { e.preventDefault(); onDragStart(e.clientX, e.clientY) }}
                            onMouseMove={e => onDragMove(e.clientX, e.clientY)}
                            onMouseUp={onDragEnd}
                            onMouseLeave={() => { if (isDragging) onDragEnd() }}
                            onTouchStart={e => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                            onTouchMove={e => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
                            onTouchEnd={onDragEnd}
                            style={{
                                position: 'absolute', inset: 0, borderRadius: '28px', overflow: 'hidden',
                                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                cursor: isDragging ? 'grabbing' : 'grab',
                                transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                                transform: getCardTransform(),
                                opacity: flyOff ? 0.5 : 1,
                                boxShadow: isDragging
                                    ? '0 20px 60px rgba(0,0,0,0.35)'
                                    : '0 10px 40px rgba(0,0,0,0.2)',
                                userSelect: 'none',
                                display: 'flex', flexDirection: 'column',
                                zIndex: 10,
                            }}
                        >
                            {/* Avatar / Cover */}
                            <div style={{
                                height: '60%', position: 'relative', width: '100%',
                                background: current.avatar_url
                                    ? `url(${current.avatar_url}) center/cover`
                                    : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                flexShrink: 0,
                            }}>
                                {/* Gradient overlay */}
                                <div style={{
                                    position: 'absolute', inset: 0,
                                    background: 'linear-gradient(transparent 40%, var(--color-bg-card) 100%)',
                                }} />

                                {/* CONNECT overlay */}
                                <div style={{
                                    position: 'absolute', top: '40px', left: '24px', padding: '8px 20px',
                                    border: '4px solid #34D399', borderRadius: '12px',
                                    color: '#34D399', fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-display)',
                                    letterSpacing: '2px', transform: 'rotate(-15deg)',
                                    opacity: likeOpacity, transition: isDragging ? 'none' : 'opacity 0.2s',
                                    textShadow: '0 2px 10px rgba(52,211,153,0.5)',
                                    pointerEvents: 'none',
                                }}>
                                    CONNECT
                                </div>

                                {/* PASS overlay */}
                                <div style={{
                                    position: 'absolute', top: '40px', right: '24px', padding: '8px 20px',
                                    border: '4px solid #F87171', borderRadius: '12px',
                                    color: '#F87171', fontSize: '28px', fontWeight: 900, fontFamily: 'var(--font-display)',
                                    letterSpacing: '2px', transform: 'rotate(15deg)',
                                    opacity: passOpacity, transition: isDragging ? 'none' : 'opacity 0.2s',
                                    textShadow: '0 2px 10px rgba(248,113,113,0.5)',
                                    pointerEvents: 'none',
                                }}>
                                    PASS
                                </div>

                                {/* No avatar fallback initial */}
                                {!current.avatar_url && (
                                    <div style={{
                                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -60%)',
                                        fontSize: '80px', fontWeight: 900, color: 'rgba(255,255,255,0.3)',
                                        fontFamily: 'var(--font-display)', pointerEvents: 'none',
                                    }}>
                                        {current.full_name?.[0] || '?'}
                                    </div>
                                )}
                            </div>

                            {/* Info Section */}
                            <div style={{
                                padding: '0 24px 24px', flex: 1, display: 'flex', flexDirection: 'column',
                                justifyContent: 'flex-start', gap: '10px', marginTop: '-20px', position: 'relative', zIndex: 5,
                            }}>
                                {/* Name + Age */}
                                <div>
                                    <h2 style={{
                                        fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 800,
                                        margin: 0, letterSpacing: '-0.01em', lineHeight: 1.2,
                                    }}>
                                        {current.full_name || 'Student'}
                                        {current.year && (
                                            <span style={{ fontWeight: 400, fontSize: '20px', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                                                {current.year}
                                            </span>
                                        )}
                                    </h2>
                                    {current.username && (
                                        <p style={{ fontSize: '14px', color: 'var(--color-primary)', margin: '2px 0 0 0', fontWeight: 600 }}>
                                            @{current.username}
                                        </p>
                                    )}
                                </div>

                                {/* Location info */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                                    {current.university && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                            <GraduationCap size={14} style={{ color: 'var(--color-text-muted)' }} /> {current.university}
                                        </span>
                                    )}
                                    {current.department && (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                                            <MapPin size={14} style={{ color: 'var(--color-text-muted)' }} /> {current.department}
                                        </span>
                                    )}
                                </div>

                                {/* Bio */}
                                {current.bio && (
                                    <p style={{
                                        fontSize: '14px', color: 'var(--color-text-primary)', margin: 0,
                                        lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {current.bio}
                                    </p>
                                )}

                                {/* Tags */}
                                {(current.interests?.length > 0 || current.skills?.length > 0) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: 'auto' }}>
                                        {[...(current.interests || []), ...(current.skills || [])].slice(0, 5).map(tag => (
                                            <span key={tag} style={{
                                                padding: '4px 12px', borderRadius: '99px', fontSize: '12px', fontWeight: 600,
                                                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(56,189,248,0.1))',
                                                color: 'var(--color-primary)', border: '1px solid rgba(139,92,246,0.2)',
                                            }}>
                                                {tag}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                        <button
                            onClick={() => handleSwipe('pass')}
                            disabled={swiping}
                            style={{
                                width: '64px', height: '64px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                backgroundColor: 'var(--color-bg-card)', border: '2px solid rgba(248,113,113,0.4)',
                                color: '#F87171', cursor: swiping ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s', outline: 'none',
                                boxShadow: '0 4px 15px rgba(248,113,113,0.15)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.borderColor = '#F87171'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(248,113,113,0.3)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.borderColor = 'rgba(248,113,113,0.4)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(248,113,113,0.15)' }}
                        >
                            <X size={28} strokeWidth={3} />
                        </button>

                        <button
                            onClick={() => handleSwipe('like')}
                            disabled={swiping}
                            style={{
                                width: '80px', height: '80px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: 'linear-gradient(135deg, #34D399, var(--color-primary))',
                                color: 'white', border: 'none', cursor: swiping ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s', outline: 'none',
                                boxShadow: '0 8px 25px rgba(52,211,153,0.3)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.12)'; e.currentTarget.style.boxShadow = '0 12px 35px rgba(52,211,153,0.4)' }}
                            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 25px rgba(52,211,153,0.3)' }}
                        >
                            <Heart size={36} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Counter */}
                    <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                        {candidates.length - currentIndex - 1} more {candidates.length - currentIndex - 1 === 1 ? 'profile' : 'profiles'} to explore
                    </p>
                </>
            )}

            {/* ===== MATCH MODAL ===== */}
            {showMatch && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', padding: '20px',
                }}>
                    {/* Floating particles */}
                    {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="match-particle" style={{
                            position: 'absolute',
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            width: `${4 + Math.random() * 8}px`,
                            height: `${4 + Math.random() * 8}px`,
                            borderRadius: '50%',
                            background: i % 3 === 0 ? 'var(--color-primary)' : i % 3 === 1 ? '#34D399' : 'var(--color-accent)',
                            opacity: 0.4 + Math.random() * 0.4,
                            animation: `matchFloat ${2 + Math.random() * 3}s ease-in-out infinite`,
                            animationDelay: `${Math.random() * 2}s`,
                        }} />
                    ))}

                    <div className="animate-scale-in" style={{
                        textAlign: 'center', maxWidth: '380px', width: '100%', position: 'relative', zIndex: 10,
                    }}>
                        {/* Dual avatars */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', marginBottom: '24px', position: 'relative' }}>
                            {/* My avatar */}
                            <div style={{
                                width: '96px', height: '96px', borderRadius: '50%',
                                background: myProfile?.avatar_url ? `url(${myProfile.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '32px', fontWeight: 800,
                                border: '4px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 8px 30px rgba(139,92,246,0.4)',
                                position: 'relative', zIndex: 2,
                            }}>
                                {!myProfile?.avatar_url && (myProfile?.full_name?.[0] || 'U')}
                            </div>

                            {/* Heart connector */}
                            <div style={{
                                width: '44px', height: '44px', borderRadius: '50%', margin: '0 -12px',
                                background: 'linear-gradient(135deg, #F43F5E, #EC4899)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', zIndex: 3,
                                boxShadow: '0 4px 20px rgba(244,63,94,0.5)',
                                animation: 'heartPulse 1.5s ease-in-out infinite',
                            }}>
                                <Heart size={22} fill="white" />
                            </div>

                            {/* Match avatar */}
                            <div style={{
                                width: '96px', height: '96px', borderRadius: '50%',
                                background: showMatch.avatar_url ? `url(${showMatch.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-secondary), var(--color-accent))',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '32px', fontWeight: 800,
                                border: '4px solid rgba(255,255,255,0.2)',
                                boxShadow: '0 8px 30px rgba(56,189,248,0.4)',
                                position: 'relative', zIndex: 2,
                            }}>
                                {!showMatch.avatar_url && (showMatch.full_name?.[0] || '?')}
                            </div>
                        </div>

                        <h2 className="gradient-text" style={{
                            fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 900,
                            margin: '0 0 4px 0', letterSpacing: '-0.02em',
                        }}>
                            It&apos;s a Match!
                        </h2>
                        <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', margin: '0 0 8px 0' }}>
                            You and <strong style={{ color: 'white' }}>{showMatch.full_name}</strong> want to connect
                        </p>
                        {showMatch.username && (
                            <p style={{ fontSize: '14px', color: 'var(--color-primary)', margin: '0 0 28px 0', fontWeight: 600 }}>
                                @{myProfile?.username} ↔ @{showMatch.username}
                            </p>
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Link
                                href="/messages"
                                className="hover-lift"
                                style={{
                                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 600, color: 'white',
                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                    border: 'none', cursor: 'pointer', boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
                                }}
                            >
                                <MessageCircle size={20} /> Send a Message
                            </Link>
                            <button
                                onClick={() => setShowMatch(null)}
                                style={{
                                    width: '100%', padding: '16px', borderRadius: '16px', fontSize: '16px', fontWeight: 500,
                                    backgroundColor: 'rgba(255,255,255,0.08)', color: 'white',
                                    border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', transition: 'background 0.2s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'}
                                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'}
                            >
                                Keep Swiping
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes matchFloat {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.3; }
                    50% { transform: translateY(-20px) scale(1.3); opacity: 0.7; }
                }
                @keyframes heartPulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.15); }
                }
            `}</style>
        </div>
    )
}
