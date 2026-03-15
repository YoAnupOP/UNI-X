'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Heart, Loader2, MessageCircle, RefreshCw, Sparkles, X, Trash2, Zap, Filter, MoreHorizontal, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { fetchJson } from '@/lib/query/fetch-json'
import { Profile, Match } from '@/lib/types'
import type { SwipeCandidate, SwipeDeckSnapshot } from './server'

const SWIPEX_DECK_QUERY_KEY = ['swipex-deck'] as const
const SWIPEX_MATCHES_QUERY_KEY = ['swipex-matches'] as const

export function SwipeXClient({ initialCandidates }: { initialCandidates: SwipeCandidate[] }) {
    const router = useRouter()
    const queryClient = useQueryClient()
    const { user, profile: myProfile, loading: authLoading } = useAuth()
    
    // UI State
    const [activeTab, setActiveTab] = useState<'discover' | 'matches'>('discover')
    const [showMatch, setShowMatch] = useState<Profile | null>(null)
    const [startingChat, setStartingChat] = useState<string | null>(null)
    const [showFilters, setShowFilters] = useState(false)
    const [limitReached, setLimitReached] = useState(false)
    const [showOptionsPopup, setShowOptionsPopup] = useState(false)

    // Filters
    const [filters, setFilters] = useState({ university: 'all', department: 'all', year: 'all' })
    const activeFilterString = useMemo(() => {
        const params = new URLSearchParams()
        if (filters.university !== 'all') params.append('university', filters.university)
        if (filters.department !== 'all') params.append('department', filters.department)
        if (filters.year !== 'all') params.append('year', filters.year)
        return params.toString()
    }, [filters])
    
    // Swipe Physics State
    const [swiping, setSwiping] = useState(false)
    const [flyOff, setFlyOff] = useState<'left' | 'right' | null>(null)
    const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const swipeTimerRef = useRef<number | null>(null)

    // Data Queries
    const deckQuery = useQuery({
        queryKey: [...SWIPEX_DECK_QUERY_KEY, activeFilterString],
        queryFn: () => fetchJson<SwipeDeckSnapshot>(`/api/swipex${activeFilterString ? `?${activeFilterString}` : ''}`, { cache: 'no-store' }),
        initialData: !activeFilterString ? { candidates: initialCandidates } : undefined,
        staleTime: 2 * 60_000,
        enabled: !authLoading,
    })

    const matchesQuery = useQuery({
        queryKey: SWIPEX_MATCHES_QUERY_KEY,
        queryFn: () => fetchJson<{ matches: Match[] }>('/api/swipex/matches', { cache: 'no-store' }),
        enabled: activeTab === 'matches' && !authLoading,
    })

    // Mutations
    const swipeMutation = useMutation({
        mutationFn: ({ targetUserId, action }: { targetUserId: string; action: 'like' | 'pass' }) =>
            fetchJson<{ match: Profile | null }>('/api/swipex', {
                method: 'POST',
                body: JSON.stringify({ targetUserId, action }),
            }),
        onMutate: async ({ targetUserId }) => {
            const previousDeck = queryClient.getQueryData<SwipeDeckSnapshot>([...SWIPEX_DECK_QUERY_KEY, activeFilterString])
            queryClient.setQueryData<SwipeDeckSnapshot>([...SWIPEX_DECK_QUERY_KEY, activeFilterString], (current) => ({
                candidates: (current?.candidates ?? []).filter((candidate) => candidate.id !== targetUserId),
            }))
            return { previousDeck }
        },
        onError: (error, _variables, context) => {
            if (context?.previousDeck) {
                queryClient.setQueryData([...SWIPEX_DECK_QUERY_KEY, activeFilterString], context.previousDeck)
            }
            if (error.message?.includes('limit reached')) {
                setLimitReached(true)
            } else {
                 alert(error.message || 'Failed to swipe')
            }
        },
        onSuccess: (result) => {
            if (result.match) {
                setShowMatch(result.match)
                queryClient.invalidateQueries({ queryKey: SWIPEX_MATCHES_QUERY_KEY })
            }
        },
        onSettled: () => {
            const remaining = queryClient.getQueryData<SwipeDeckSnapshot>([...SWIPEX_DECK_QUERY_KEY, activeFilterString])?.candidates.length ?? 0
            if (remaining <= 5 && !limitReached) {
                void deckQuery.refetch()
            }
        },
    })

    const deleteMatchMutation = useMutation({
        mutationFn: (matchId: string) => fetchJson(`/api/swipex/matches/${matchId}`, { method: 'DELETE' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: SWIPEX_MATCHES_QUERY_KEY })
        }
    })

    const blockMutation = useMutation({
        // Placeholder for real block logic later—for now, just removes them from deck locally.
        mutationFn: async (targetId: string) => {
            queryClient.setQueryData<SwipeDeckSnapshot>([...SWIPEX_DECK_QUERY_KEY, activeFilterString], (current) => ({
                candidates: (current?.candidates ?? []).filter((candidate) => candidate.id !== targetId),
            }))
            return { success: true }
        },
        onSuccess: () => {
            setShowOptionsPopup(false)
            alert('User blocked.')
        }
    })

    const { isPending: isSwipePending, mutate: submitSwipe } = swipeMutation
    const candidates = deckQuery.data?.candidates ?? []
    const current = candidates[0]
    const next = candidates[1]
    
    // Physics calculations
    const rotation = isDragging ? dragOffset.x * 0.08 : 0
    const likeOpacity = Math.min(Math.max(dragOffset.x / 100, 0), 1)
    const passOpacity = Math.min(Math.max(-dragOffset.x / 100, 0), 1)
    
    const matchParticles = useMemo(() => Array.from({ length: 24 }, (_, index) => ({
        left: `${(index * 13) % 100}%`,
        top: `${(index * 17) % 100}%`,
        size: `${6 + (index % 4) * 4}px`,
        animationDelay: `${(index % 8) * 0.15}s`,
    })), [])

    useEffect(() => {
        return () => {
            if (swipeTimerRef.current) {
                window.clearTimeout(swipeTimerRef.current)
            }
        }
    }, [])

    const getCardTransform = () => {
        if (flyOff === 'left') return 'translateX(-150vw) rotate(-30deg)'
        if (flyOff === 'right') return 'translateX(150vw) rotate(30deg)'
        if (isDragging) return `translate(${dragOffset.x}px, ${dragOffset.y}px) rotate(${rotation}deg)`
        return 'translate(0, 0) rotate(0deg)'
    }

    const beginSwipe = (action: 'like' | 'pass') => {
        if (!user || !current || swiping || isSwipePending || limitReached || showOptionsPopup) return
        setSwiping(true)
        setFlyOff(action === 'like' ? 'right' : 'left')

        swipeTimerRef.current = window.setTimeout(() => {
            submitSwipe({ targetUserId: current.id, action })
            setFlyOff(null)
            setDragOffset({ x: 0, y: 0 })
            setDragStart(null)
            setIsDragging(false)
            setSwiping(false)
        }, 220)
    }

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (!user || !current || swiping || isSwipePending || activeTab !== 'discover' || showMatch || limitReached || showOptionsPopup) return
            const action = event.key === 'ArrowLeft' ? 'pass' : event.key === 'ArrowRight' ? 'like' : null
            if (!action) return
            
            event.preventDefault()
            beginSwipe(action)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [current, isSwipePending, submitSwipe, swiping, user, activeTab, showMatch, limitReached, showOptionsPopup])

    const onDragStart = (clientX: number, clientY: number) => {
        if (swiping || isSwipePending || limitReached || showOptionsPopup) return
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
            beginSwipe(dragOffset.x > 0 ? 'like' : 'pass')
            return
        }
        setDragOffset({ x: 0, y: 0 })
    }

    const startConversation = async (targetUserId: string) => {
        setStartingChat(targetUserId)
        try {
            const data = await fetchJson<{ conversationId: string }>('/api/start-conversation', {
                method: 'POST',
                body: JSON.stringify({ targetUserId }),
            })
            router.push(`/messages?convo=${data.conversationId}`)
        } finally {
            setStartingChat(null)
        }
    }

    if (authLoading || (deckQuery.isLoading && !current)) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
                <Loader2 size={40} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
                <p style={{ fontSize: 15, color: 'var(--color-text-muted)', fontWeight: 500 }}>Finding students near you...</p>
            </div>
        )
    }

    return (
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '0 16px', gap: 24, minHeight: 'calc(100vh - 100px)' }}>
            
            {/* Header & Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', paddingTop: 16 }}>
                <div style={{ display: 'flex', background: 'var(--color-bg-card)', padding: 6, borderRadius: 99, border: '1px solid var(--color-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', position: 'relative', zIndex: 10 }}>
                    <button onClick={() => setActiveTab('discover')} style={{ padding: '10px 32px', borderRadius: 99, background: activeTab === 'discover' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'discover' ? 'white' : 'var(--color-text-muted)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: activeTab === 'discover' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none' }}>
                        Discover
                    </button>
                    <button onClick={() => setActiveTab('matches')} style={{ padding: '10px 32px', borderRadius: 99, background: activeTab === 'matches' ? 'var(--color-primary)' : 'transparent', color: activeTab === 'matches' ? 'white' : 'var(--color-text-muted)', border: 'none', fontSize: 15, fontWeight: 700, cursor: 'pointer', transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', boxShadow: activeTab === 'matches' ? '0 4px 12px rgba(139,92,246,0.3)' : 'none' }}>
                        Matches
                    </button>
                </div>

                {activeTab === 'discover' && (
                     <button onClick={() => setShowFilters(!showFilters)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 99, border: '1px solid var(--color-border)', background: showFilters ? 'var(--color-bg-elevated)' : 'transparent', color: 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                        <Filter size={14} /> Filter &amp; Search
                    </button>
                )}
            </div>

            {/* Discover Tab */}
            {activeTab === 'discover' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, position: 'relative' }}>
                    
                    {showFilters && (
                        <div style={{ padding: '16px 20px', borderRadius: 24, background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', marginBottom: 20, animation: 'fadeIn 0.2s ease-out' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Department</label>
                                    <select value={filters.department} onChange={(e) => setFilters(p => ({ ...p, department: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)'}}>
                                        <option value="all">Any</option>
                                        <option value="Computer Science">Computer Science</option>
                                        <option value="BCA">BCA</option>
                                        <option value="BBA">BBA</option>
                                        <option value="AI / ML">AI / ML</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: 6 }}>Year</label>
                                    <select value={filters.year} onChange={(e) => setFilters(p => ({ ...p, year: e.target.value }))} style={{ width: '100%', padding: '10px 14px', borderRadius: 12, background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)'}}>
                                        <option value="all">Any</option>
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {limitReached ? (
                        <div style={{ textAlign: 'center', padding: '80px 24px', borderRadius: 32, backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(239, 68, 68, 0.1)' }}>
                                <ShieldAlert size={36} color="#EF4444" />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, margin: '0 0 12px 0' }}>Daily Limit Reached</h3>
                            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 0 0', lineHeight: 1.6, maxWidth: 320 }}>You&apos;ve sent 50 likes today! Check back tomorrow to make more connections.</p>
                        </div>
                    ) : !current ? (
                        <div style={{ textAlign: 'center', padding: '100px 24px', borderRadius: 32, backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: 90, height: 90, borderRadius: '50%', margin: '0 auto 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(139,92,246,0.1)' }}>
                                <Sparkles size={40} style={{ color: 'var(--color-primary)' }} />
                            </div>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, margin: '0 0 12px 0' }}>You&apos;re all caught up!</h3>
                            <p style={{ fontSize: 15, color: 'var(--color-text-muted)', margin: '0 0 32px 0', lineHeight: 1.6, maxWidth: 320 }}>You&apos;ve seen all the students matching your criteria right now. Check back later for new faces.</p>
                            <button onClick={() => void deckQuery.refetch()} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '16px 32px', borderRadius: 99, fontSize: 16, fontWeight: 700, color: 'white', background: 'var(--color-primary)', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px rgba(139,92,246,0.3)', transition: 'transform 0.2s' }}>
                                <RefreshCw size={20} /> Refresh Deck
                            </button>
                        </div>
                    ) : (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                            {/* Premium Card Stack */}
                            <div style={{ position: 'relative', height: '65vh', minHeight: 480, maxHeight: 680, width: '100%', maxWidth: 440, perspective: '1500px' }}>
                                
                                {next && (
                                    <div style={{ position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden', backgroundColor: 'var(--color-bg-card)', transform: `scale(${0.92 + Math.min(Math.abs(dragOffset.x) / 1800, 0.08)}) translateY(${12 - Math.min(Math.abs(dragOffset.x) / 20, 12)}px)`, opacity: 0.5 + Math.min(Math.abs(dragOffset.x) / 400, 0.5), transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                                        <div style={{ position: 'absolute', inset: 0, background: next.avatar_url ? `url(${next.avatar_url}) center/cover` : 'var(--color-primary)' }} />
                                    </div>
                                )}

                                <div
                                    onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY) }}
                                    onMouseMove={(e) => onDragMove(e.clientX, e.clientY)}
                                    onMouseUp={onDragEnd}
                                    onMouseLeave={() => { if (isDragging) onDragEnd() }}
                                    onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                                    onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
                                    onTouchEnd={onDragEnd}
                                    style={{ 
                                        position: 'absolute', inset: 0, borderRadius: 32, overflow: 'hidden', 
                                        backgroundColor: 'var(--color-bg-card)', cursor: isDragging ? 'grabbing' : 'grab', 
                                        transition: isDragging ? 'none' : 'all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)', 
                                        transform: getCardTransform(), opacity: flyOff ? 0 : 1, 
                                        boxShadow: isDragging ? '0 30px 60px rgba(0,0,0,0.3)' : '0 15px 40px rgba(0,0,0,0.15)', 
                                        userSelect: 'none' 
                                    }}
                                >
                                    {/* Full bleed image */}
                                    <div style={{ position: 'absolute', inset: 0, background: current.avatar_url ? `url(${current.avatar_url}) center/cover` : 'var(--color-primary)' }} />
                                    
                                    {/* Smooth gradient overlay from bottom. Made taller to accommodate hints. */}
                                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 35%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.96) 100%)' }} />

                                    {/* Like/Pass Overlays */}
                                    <div style={{ position: 'absolute', top: 50, left: 30, padding: '10px 24px', border: '5px solid #34D399', borderRadius: 16, color: '#34D399', fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '4px', transform: 'rotate(-20deg)', opacity: likeOpacity, pointerEvents: 'none', background: 'rgba(52,211,153,0.1)', backdropFilter: 'blur(4px)' }}>LIKE</div>
                                    <div style={{ position: 'absolute', top: 50, right: 30, padding: '10px 24px', border: '5px solid #F87171', borderRadius: 16, color: '#F87171', fontSize: 36, fontWeight: 900, fontFamily: 'var(--font-display)', letterSpacing: '4px', transform: 'rotate(20deg)', opacity: passOpacity, pointerEvents: 'none', background: 'rgba(248,113,113,0.1)', backdropFilter: 'blur(4px)' }}>PASS</div>

                                    {/* Options Menu Toggle */}
                                    <button onClick={(e) => { e.stopPropagation(); setShowOptionsPopup(true) }} style={{ position: 'absolute', top: 20, right: 20, width: 40, height: 40, borderRadius: '50%', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 20 }}>
                                        <MoreHorizontal size={20} />
                                    </button>
                                    
                                    {showOptionsPopup && (
                                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 30, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', padding: 70 }}>
                                            <div style={{ background: '#1c1c1e', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', minWidth: 200, animation: 'fadeIn 0.15s ease-out' }}>
                                                <button onClick={(e) => { e.stopPropagation(); blockMutation.mutate(current.id) }} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', color: '#EF4444', fontSize: 15, fontWeight: 600, cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                                    <ShieldAlert size={18} /> Block &amp; Report
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setShowOptionsPopup(false) }} style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', color: 'white', fontSize: 15, fontWeight: 500, cursor: 'pointer', textAlign: 'left' }}>
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Glassmorphic Info Content Layered On Top */}
                                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '32px 24px 24px 24px', display: 'flex', flexDirection: 'column', gap: 10, color: 'white', zIndex: 10 }}>

                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
                                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', textShadow: '0 2px 10px rgba(0,0,0,0.6)' }}>
                                                {current.full_name || 'Student'}
                                            </h2>
                                            {current.year && <span style={{ fontWeight: 500, fontSize: 22, opacity: 0.9, textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>{current.year}</span>}
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 500, opacity: 0.95, textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>
                                            {current.department && <span>{current.department}</span>}
                                            {current.department && current.university && <span style={{ opacity: 0.6 }}>•</span>}
                                            {current.university && <span>{current.university}</span>}
                                        </div>
                                        
                                        {current.bio && <p style={{ fontSize: 16, margin: '4px 0 0 0', lineHeight: 1.45, opacity: 0.95, textShadow: '0 1px 5px rgba(0,0,0,0.5)' }}>{current.bio}</p>}

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
                                            {[...(current.interests || []), ...(current.skills || [])].slice(0, 5).map((tag) => (
                                                <span key={tag} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 600, background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.25)', textShadow: '0 1px 2px rgba(0,0,0,0.3)', color: 'white' }}>
                                                    {tag}
                                                </span>
                                            ))}
                                            {current.sharedTraits.length > 0 && current.sharedTraits.slice(0, 1).map((trait) => (
                                                <span key={trait} style={{ padding: '6px 14px', borderRadius: 99, fontSize: 13, fontWeight: 700, background: 'linear-gradient(135deg, rgba(52,211,153,0.3), rgba(16,185,129,0.3))', backdropFilter: 'blur(12px)', border: '1px solid rgba(52,211,153,0.4)', color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Zap size={12} fill="white" /> Shared {trait}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, width: '100%' }}>
                                <button onClick={() => beginSwipe('pass')} disabled={swiping || isSwipePending || limitReached} style={{ width: 68, height: 68, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', color: '#F87171', cursor: swiping ? 'not-allowed' : 'pointer', boxShadow: '0 10px 25px rgba(0,0,0,0.06)', transition: 'transform 0.2s', transform: swiping ? 'scale(0.9)' : 'scale(1)' }}>
                                    <X size={32} strokeWidth={2.5} />
                                </button>
                                <button onClick={() => beginSwipe('like')} disabled={swiping || isSwipePending || limitReached} style={{ width: 88, height: 88, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-primary)', color: 'white', border: 'none', cursor: swiping ? 'not-allowed' : 'pointer', boxShadow: '0 15px 35px rgba(16,185,129,0.35)', transition: 'transform 0.2s', transform: swiping ? 'scale(0.9)' : 'scale(1)' }}>
                                    <Heart size={42} strokeWidth={2.5} fill="white" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Matches Center Tab */}
            {activeTab === 'matches' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 40 }}>
                    <div style={{ padding: '0 4px', marginBottom: 8 }}>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 800, margin: '0 0 4px 0' }}>Your Matches</h2>
                        <p style={{ color: 'var(--color-text-muted)', fontSize: 14, margin: 0 }}>Connections who swiped right on you too.</p>
                    </div>

                    {matchesQuery.isLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
                    ) : matchesQuery.error ? (
                        <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-error)', background: 'var(--color-bg-card)', borderRadius: 24 }}>Failed to load matches.</div>
                    ) : !matchesQuery.data?.matches || matchesQuery.data.matches.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--color-bg-card)', borderRadius: 28, border: '1px dashed var(--color-border)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
                            <div style={{ width: 70, height: 70, borderRadius: '50%', background: 'rgba(248,113,113,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Heart size={30} color="#F87171" />
                            </div>
                            <div>
                                <h3 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 700 }}>No matches yet</h3>
                                <p style={{ margin: 0, color: 'var(--color-text-muted)', fontSize: 14 }}>Keep swiping in Discover to make new connections!</p>
                            </div>
                            <button onClick={() => setActiveTab('discover')} style={{ marginTop: 8, padding: '12px 28px', borderRadius: 99, background: 'var(--color-primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer' }}>Go to Discover</button>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {matchesQuery.data.matches.map((match) => (
                                <div key={match.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: 'var(--color-bg-card)', borderRadius: 24, border: '1px solid var(--color-border)', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', transition: 'transform 0.2s' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                                        <div style={{ width: 64, height: 64, borderRadius: 20, background: match.matched_user?.avatar_url ? `url(${match.matched_user.avatar_url}) center/cover` : 'var(--color-primary)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: 'white' }}>
                                            {!match.matched_user?.avatar_url && (match.matched_user?.full_name?.[0] || '?')}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 2 }}>{match.matched_user?.full_name}</div>
                                            <div style={{ fontSize: 14, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {match.matched_user?.department && <span>{match.matched_user.department}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button onClick={() => startConversation(match.matched_user?.id!)} disabled={startingChat === match.matched_user?.id} style={{ padding: '10px 18px', borderRadius: 99, background: 'var(--color-primary)', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, boxShadow: '0 4px 10px rgba(139,92,246,0.2)' }}>
                                            {startingChat === match.matched_user?.id ? <Loader2 size={18} className="animate-spin" /> : <MessageCircle size={18} fill="currentColor" />} <span className="hide-mobile">Message</span>
                                        </button>
                                        <button onClick={() => { if(confirm('Remove this match?')) deleteMatchMutation.mutate(match.id) }} disabled={deleteMatchMutation.isPending} style={{ padding: '10px', borderRadius: 99, background: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                            {deleteMatchMutation.isPending && deleteMatchMutation.variables === match.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Premium Match Celebration Modal */}
            {showMatch && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(8,10,15,0.92)', backdropFilter: 'blur(20px)', padding: 24, animation: 'fadeIn 0.3s ease-out' }}>
                    {/* Confetti Particles */}
                    {matchParticles.map((particle, index) => (
                        <div key={index} style={{ position: 'absolute', left: particle.left, top: particle.top, width: particle.size, height: particle.size, borderRadius: index % 3 === 0 ? '4px' : '50%', background: index % 2 === 0 ? '#34D399' : index % 3 === 0 ? '#F472B6' : 'var(--color-primary)', opacity: 0.8, animation: `matchFloat ${2 + (index % 3)}s ease-in-out infinite`, animationDelay: particle.animationDelay, boxShadow: `0 0 10px ${index % 2 === 0 ? '#34D399' : 'var(--color-primary)'}` }} />
                    ))}
                    
                    <div style={{ textAlign: 'center', maxWidth: 420, width: '100%', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 32, position: 'relative' }}>
                            <div style={{ width: 120, height: 120, borderRadius: '50%', background: myProfile?.avatar_url ? `url(${myProfile.avatar_url}) center/cover` : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 40, fontWeight: 800, border: '5px solid #080A0F', zIndex: 2, transform: 'translateX(20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                                {!myProfile?.avatar_url && (myProfile?.full_name?.[0] || 'U')}
                            </div>
                            <div style={{ width: 120, height: 120, borderRadius: '50%', background: showMatch.avatar_url ? `url(${showMatch.avatar_url}) center/cover` : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 40, fontWeight: 800, border: '5px solid #080A0F', zIndex: 1, transform: 'translateX(-20px)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                                {!showMatch.avatar_url && (showMatch.full_name?.[0] || '?')}
                            </div>
                            <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', width: 48, height: 48, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 3, border: '4px solid #080A0F', boxShadow: '0 10px 20px rgba(244,63,94,0.4)' }}>
                                <Heart size={24} fill="white" />
                            </div>
                        </div>

                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 48, fontWeight: 900, margin: '0 0 12px 0', background: 'var(--color-primary)', color: 'var(--color-primary)', letterSpacing: '-0.02em', filter: 'drop-shadow(0 2px 10px rgba(52,211,153,0.3))' }}>It&apos;s a Match!</h2>
                        <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.85)', margin: '0 0 40px 0', lineHeight: 1.5 }}>You and <strong style={{ color: 'white', fontSize: 19 }}>{showMatch.full_name}</strong> both swiped right. Don&apos;t keep them waiting!</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
                            <button onClick={() => startConversation(showMatch.id)} disabled={startingChat === showMatch.id} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '18px 24px', borderRadius: 99, fontSize: 17, fontWeight: 700, color: 'white', background: 'var(--color-primary)', border: 'none', cursor: 'pointer', boxShadow: '0 10px 30px rgba(139,92,246,0.3)', transition: 'transform 0.2s' }}>
                                {startingChat === showMatch.id ? <Loader2 size={22} className="animate-spin" /> : <MessageCircle size={22} />}
                                {startingChat === showMatch.id ? 'Opening chat...' : 'Send a Message'}
                            </button>
                            <button onClick={() => setShowMatch(null)} style={{ width: '100%', padding: '18px 24px', borderRadius: 99, fontSize: 17, fontWeight: 700, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', backdropFilter: 'blur(10px)', transition: 'background-color 0.2s' }}>
                                Keep Swiping
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes matchFloat {
                    0%, 100% { transform: translateY(0) scale(1) rotate(0deg); opacity: 0.3; }
                    50% { transform: translateY(-25px) scale(1.3) rotate(20deg); opacity: 0.9; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; backdrop-filter: blur(0px); }
                    to { opacity: 1; backdrop-filter: blur(20px); }
                }
                @media (max-width: 480px) {
                    .hide-mobile { display: none; }
                }
            `}</style>
        </div>
    )
}
