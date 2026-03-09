'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, Bell, Sparkles, Loader2, Users, Calendar, FileText, User, X } from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

interface SearchResults {
    people: { id: string; username: string; full_name: string; display_name: string; avatar_url: string; university: string; department: string }[]
    clubs: { id: string; name: string; description: string; avatar_url: string; category: string; members_count: number }[]
    events: { id: string; title: string; description: string; location: string; start_date: string; image_url: string; rsvp_count: number }[]
    posts: { id: string; content: string; author_id: string; likes_count: number; comments_count: number; created_at: string; author: { id: string; username: string; full_name: string; avatar_url: string } | null }[]
}

export default function TopBar() {
    const { profile } = useAuth()
    const router = useRouter()
    const [query, setQuery] = useState('')
    const [results, setResults] = useState<SearchResults | null>(null)
    const [searching, setSearching] = useState(false)
    const [error, setError] = useState('')
    const [open, setOpen] = useState(false)
    const [focusIndex, setFocusIndex] = useState(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Flatten results for keyboard navigation
    const flatItems = results ? [
        ...results.people.map(p => ({ type: 'person' as const, id: p.id, href: `/profile/${p.id}` })),
        ...results.clubs.map(c => ({ type: 'club' as const, id: c.id, href: `/clubs` })),
        ...results.events.map(e => ({ type: 'event' as const, id: e.id, href: `/events` })),
        ...results.posts.map(p => ({ type: 'post' as const, id: p.id, href: `/feed` })),
    ] : []

    const doSearch = useCallback(async (q: string) => {
        if (q.trim().length < 2) {
            setResults(null)
            setSearching(false)
            return
        }
        setSearching(true)
        setError('')
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q.trim())}&limit=5`)
            if (!res.ok) throw new Error('Search request failed')
            const data = await res.json()
            if (data.error) throw new Error(data.error)
            setResults(data)
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : 'Search failed')
            setResults(null)
        } finally {
            setSearching(false)
        }
    }, [])

    // Debounced search
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)
        if (query.trim().length < 2) {
            setResults(null)
            setSearching(false)
            return
        }
        setSearching(true)
        debounceRef.current = setTimeout(() => doSearch(query), 300)
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
    }, [query, doSearch])

    // Keyboard shortcut: Cmd+K / Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                if (open) {
                    closeSearch()
                } else {
                    setOpen(true)
                    setTimeout(() => inputRef.current?.focus(), 0)
                }
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [open])

    // Close on outside click
    useEffect(() => {
        if (!open) return
        const handleClick = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                closeSearch()
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [open])

    const closeSearch = () => {
        setOpen(false)
        setQuery('')
        setResults(null)
        setError('')
        setFocusIndex(-1)
    }

    const navigate = (href: string) => {
        closeSearch()
        router.push(href)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            closeSearch()
            return
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setFocusIndex(prev => Math.min(prev + 1, flatItems.length - 1))
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault()
            setFocusIndex(prev => Math.max(prev - 1, -1))
        }
        if (e.key === 'Enter' && focusIndex >= 0 && flatItems[focusIndex]) {
            e.preventDefault()
            navigate(flatItems[focusIndex].href)
        }
    }

    // Reset focus when results change
    useEffect(() => { setFocusIndex(-1) }, [results])

    const hasResults = results && (results.people.length + results.clubs.length + results.events.length + results.posts.length) > 0
    const hasQuery = query.trim().length >= 2

    // Track cumulative index for keyboard nav highlighting
    let itemIndex = -1

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '0 16px',
            backgroundColor: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom: '1px solid var(--color-border)',
            overflow: 'visible',
        }}>
            {/* Search */}
            <div ref={containerRef} style={{ position: 'relative', flex: 1, minWidth: 0, maxWidth: '480px' }}>
                <div
                    onClick={() => { if (!open) { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) } }}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: open ? '10px 10px 0 0' : '10px',
                        backgroundColor: 'var(--color-bg-card)',
                        borderTop: `1px solid ${open ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderLeft: `1px solid ${open ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderRight: `1px solid ${open ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        borderBottom: open && hasQuery ? '1px solid var(--color-border)' : `1px solid ${open ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        cursor: 'text',
                        transition: 'border-color 0.15s',
                    }}
                >
                    {searching ? (
                        <Loader2 size={15} style={{ color: 'var(--color-primary)', flexShrink: 0, animation: 'spin 1s linear infinite' }} />
                    ) : (
                        <Search size={15} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
                    )}
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Search people, clubs, events..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onFocus={() => setOpen(true)}
                        onKeyDown={handleKeyDown}
                        style={{
                            background: 'none',
                            border: 'none',
                            outline: 'none',
                            fontSize: '13px',
                            color: 'var(--color-text-primary)',
                            width: '100%',
                            fontFamily: 'var(--font-body)',
                        }}
                    />
                    {open && query ? (
                        <button onClick={(e) => { e.stopPropagation(); setQuery(''); setResults(null); inputRef.current?.focus() }} style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
                            color: 'var(--color-text-muted)', display: 'flex', flexShrink: 0,
                        }}>
                            <X size={14} />
                        </button>
                    ) : (
                        <kbd style={{
                            fontSize: '10px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--color-bg-elevated)',
                            color: 'var(--color-text-muted)',
                            border: '1px solid var(--color-border)',
                            fontFamily: 'monospace',
                            flexShrink: 0,
                        }}>⌘K</kbd>
                    )}
                </div>

                {/* Search Results Dropdown */}
                {open && hasQuery && (
                    <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        maxHeight: '420px',
                        overflowY: 'auto',
                        backgroundColor: 'var(--color-bg-card)',
                        border: '1px solid var(--color-primary)',
                        borderTop: 'none',
                        borderRadius: '0 0 10px 10px',
                        zIndex: 50,
                        boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
                    }}>
                        {/* Error state */}
                        {error && (
                            <div style={{ padding: '16px 20px', color: '#F87171', fontSize: '13px', textAlign: 'center' }}>
                                {error}. Try again.
                            </div>
                        )}

                        {/* Loading state — only show if no results yet */}
                        {searching && !results && !error && (
                            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                                Searching...
                            </div>
                        )}

                        {/* Empty state */}
                        {!searching && !error && results && !hasResults && (
                            <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                                No results for &quot;{query.trim()}&quot;
                            </div>
                        )}

                        {/* Results */}
                        {hasResults && (
                            <>
                                {/* People */}
                                {results!.people.length > 0 && (
                                    <div>
                                        <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <User size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                            People
                                        </div>
                                        {results!.people.map(p => {
                                            itemIndex++
                                            const idx = itemIndex
                                            return (
                                                <button
                                                    key={p.id}
                                                    onClick={() => navigate(`/profile/${p.id}`)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                        padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                                        backgroundColor: focusIndex === idx ? 'var(--color-bg-elevated)' : 'transparent',
                                                        transition: 'background-color 0.1s',
                                                    }}
                                                    onMouseEnter={() => setFocusIndex(idx)}
                                                >
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                                        background: p.avatar_url ? `url(${p.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: '12px', fontWeight: 700,
                                                    }}>
                                                        {!p.avatar_url && (p.full_name?.[0] || '?')}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {p.display_name || p.full_name}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            @{p.username} {p.university && `· ${p.university}`}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Clubs */}
                                {results!.clubs.length > 0 && (
                                    <div>
                                        <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Users size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                            Clubs
                                        </div>
                                        {results!.clubs.map(c => {
                                            itemIndex++
                                            const idx = itemIndex
                                            return (
                                                <button
                                                    key={c.id}
                                                    onClick={() => navigate(`/clubs`)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                        padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                                        backgroundColor: focusIndex === idx ? 'var(--color-bg-elevated)' : 'transparent',
                                                        transition: 'background-color 0.1s',
                                                    }}
                                                    onMouseEnter={() => setFocusIndex(idx)}
                                                >
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                                        background: c.avatar_url ? `url(${c.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white', fontSize: '12px', fontWeight: 700,
                                                    }}>
                                                        {!c.avatar_url && (c.name?.[0] || '?')}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {c.name}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {c.category} · {c.members_count} members
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Events */}
                                {results!.events.length > 0 && (
                                    <div>
                                        <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <Calendar size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                            Events
                                        </div>
                                        {results!.events.map(ev => {
                                            itemIndex++
                                            const idx = itemIndex
                                            return (
                                                <button
                                                    key={ev.id}
                                                    onClick={() => navigate(`/events`)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                        padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                                        backgroundColor: focusIndex === idx ? 'var(--color-bg-elevated)' : 'transparent',
                                                        transition: 'background-color 0.1s',
                                                    }}
                                                    onMouseEnter={() => setFocusIndex(idx)}
                                                >
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                                        background: 'var(--color-bg-elevated)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'var(--color-primary)', fontSize: '14px',
                                                    }}>
                                                        <Calendar size={16} />
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {ev.title}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {new Date(ev.start_date).toLocaleDateString([], { month: 'short', day: 'numeric' })} {ev.location && `· ${ev.location}`}
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}

                                {/* Posts */}
                                {results!.posts.length > 0 && (
                                    <div>
                                        <div style={{ padding: '8px 16px 4px', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                            <FileText size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                            Posts
                                        </div>
                                        {results!.posts.map(post => {
                                            itemIndex++
                                            const idx = itemIndex
                                            const author = Array.isArray(post.author) ? post.author[0] : post.author
                                            return (
                                                <button
                                                    key={post.id}
                                                    onClick={() => navigate(`/feed`)}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px', width: '100%',
                                                        padding: '8px 16px', border: 'none', cursor: 'pointer', textAlign: 'left',
                                                        backgroundColor: focusIndex === idx ? 'var(--color-bg-elevated)' : 'transparent',
                                                        transition: 'background-color 0.1s',
                                                    }}
                                                    onMouseEnter={() => setFocusIndex(idx)}
                                                >
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                                                        background: author?.avatar_url ? `url(${author.avatar_url}) center/cover` : 'var(--color-bg-elevated)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'var(--color-text-muted)', fontSize: '12px',
                                                    }}>
                                                        {!author?.avatar_url && <FileText size={14} />}
                                                    </div>
                                                    <div style={{ minWidth: 0, flex: 1 }}>
                                                        <div style={{ fontSize: '13px', color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                            {post.content.length > 80 ? post.content.slice(0, 80) + '...' : post.content}
                                                        </div>
                                                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                            {author?.full_name || 'Unknown'} · {post.likes_count} likes
                                                        </div>
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Footer hint */}
                        {hasResults && (
                            <div style={{ padding: '6px 16px 8px', fontSize: '11px', color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '12px' }}>
                                <span>↑↓ Navigate</span>
                                <span>↵ Open</span>
                                <span>Esc Close</span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Right Side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                <Link href="/xplore-ai" title="XPLORE AI" style={{
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    transition: 'color 0.15s',
                }}>
                    <Sparkles size={18} />
                </Link>

                <Link href="/notifications" title="Notifications" style={{
                    padding: '8px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--color-text-muted)',
                    position: 'relative',
                }}>
                    <Bell size={18} />
                </Link>

                <Link href={`/profile/${profile?.id || ''}`} style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: profile?.avatar_url
                        ? `url(${profile.avatar_url}) center/cover`
                        : 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                    color: 'white',
                    fontSize: '13px',
                    fontWeight: 700,
                    marginLeft: '4px',
                }}>
                    {!profile?.avatar_url && (profile?.full_name?.[0] || 'U')}
                </Link>
            </div>
        </header>
    )
}
