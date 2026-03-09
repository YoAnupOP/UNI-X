'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Club } from '@/lib/types'
import { Search, Plus, Users, Loader2 } from 'lucide-react'
import { setCache } from '@/lib/cache'
import { useCachedQuery } from '@/lib/useCachedQuery'

const categories = ['all', 'tech', 'arts', 'sports', 'academic', 'social', 'cultural'] as const

export default function ClubsPage() {
    const { user, loading: authLoading } = useAuth()
    const supabase = createClient()
    const [search, setSearch] = useState('')
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [showCreate, setShowCreate] = useState(false)
    const [newClub, setNewClub] = useState({ name: '', description: '', category: 'general' })
    const [creating, setCreating] = useState(false)

    const fetchClubsData = useCallback(async () => {
        let query = supabase.from('clubs').select('*').eq('is_active', true).order('members_count', { ascending: false })
        if (activeCategory !== 'all') query = query.eq('category', activeCategory)
        const { data } = await query

        if (data && user) {
            const { data: memberships } = await supabase.from('club_members').select('club_id').eq('user_id', user.id)
            const memberClubIds = new Set(memberships?.map(m => m.club_id))
            return data.map(c => ({ ...c, is_member: memberClubIds.has(c.id) })) as Club[]
        }
        return (data as Club[]) ?? null
    }, [activeCategory, user, supabase])

    const { data: clubs, setData: setClubs, isLoading: loading, refresh: refreshClubs } = useCachedQuery(
        `clubs-data-${activeCategory}`,
        fetchClubsData,
        [] as Club[],
        { enabled: !authLoading }
    )

    const handleJoin = async (clubId: string) => {
        if (!user) return
        const club = clubs.find(c => c.id === clubId)
        if (!club) return

        const wasMember = club.is_member
        const newMemberState = !wasMember
        const countDelta = newMemberState ? 1 : -1

        // Optimistic update — instant UI response
        setClubs(prev => prev.map(c => c.id === clubId
            ? { ...c, is_member: newMemberState, members_count: c.members_count + countDelta }
            : c
        ))

        try {
            if (wasMember) {
                await supabase.from('club_members').delete().eq('club_id', clubId).eq('user_id', user.id)
                await supabase.from('clubs').update({ members_count: club.members_count - 1 }).eq('id', clubId)
            } else {
                await supabase.from('club_members').insert({ club_id: clubId, user_id: user.id })
                await supabase.from('clubs').update({ members_count: club.members_count + 1 }).eq('id', clubId)
            }
        } catch {
            // Rollback on failure
            setClubs(prev => prev.map(c => c.id === clubId
                ? { ...c, is_member: wasMember, members_count: club.members_count }
                : c
            ))
        }
    }

    const handleCreateClub = async () => {
        if (!user || !newClub.name.trim()) return
        setCreating(true)
        const { error } = await supabase.from('clubs').insert({
            name: newClub.name,
            description: newClub.description,
            category: newClub.category,
            admin_id: user.id,
            members_count: 1,
        })
        if (!error) {
            setNewClub({ name: '', description: '', category: 'general' })
            setShowCreate(false)
            refreshClubs(true)
        }
        setCreating(false)
    }

    const filtered = clubs.filter(c => {
        const q = search.toLowerCase()
        return c.name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
    })

    return (
        <div style={{ maxWidth: '896px', width: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', overflow: 'hidden' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                    Clubs & Communities
                </h1>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="hover-lift"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                        borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        border: 'none', cursor: 'pointer',
                    }}
                >
                    <Plus size={16} /> Create Club
                </button>
            </div>

            {/* Create Club Form */}
            {showCreate && (
                <div className="animate-scale-in" style={{
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>
                        Create a New Club
                    </h3>
                    <input
                        type="text"
                        value={newClub.name}
                        onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                        placeholder="Club name"
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)', outline: 'none',
                        }}
                    />
                    <textarea
                        value={newClub.description}
                        onChange={(e) => setNewClub({ ...newClub, description: e.target.value })}
                        placeholder="Describe your club..."
                        rows={3}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)', resize: 'none', outline: 'none',
                            fontFamily: 'var(--font-body)',
                        }}
                    />
                    <select
                        value={newClub.category}
                        onChange={(e) => setNewClub({ ...newClub, category: e.target.value })}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)', outline: 'none', cursor: 'pointer',
                        }}
                    >
                        {categories.filter(c => c !== 'all').map(c => (
                            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                        ))}
                    </select>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                        <button
                            onClick={() => setShowCreate(false)}
                            style={{
                                padding: '8px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 500,
                                color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreateClub}
                            disabled={creating || !newClub.name.trim()}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px',
                                borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                border: 'none', cursor: (creating || !newClub.name.trim()) ? 'not-allowed' : 'pointer',
                                opacity: (creating || !newClub.name.trim()) ? 0.5 : 1,
                            }}
                        >
                            {creating ? <Loader2 size={14} className="animate-spin" /> : null} Create
                        </button>
                    </div>
                </div>
            )}

            {/* Search & Filters */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', borderRadius: '12px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                }}>
                    <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search clubs..."
                        style={{
                            width: '100%', background: 'none', border: 'none', outline: 'none',
                            fontSize: '14px', color: 'var(--color-text-primary)',
                        }}
                    />
                </div>

                <div className="no-scrollbar" style={{
                    display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px',
                }}>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            style={{
                                padding: '6px 14px', borderRadius: '10px', fontSize: '13px', fontWeight: 500,
                                whiteSpace: 'nowrap', transition: 'all 0.2s', cursor: 'pointer',
                                backgroundColor: activeCategory === cat ? 'var(--color-primary)' : 'var(--color-bg-card)',
                                color: activeCategory === cat ? 'white' : 'var(--color-text-secondary)',
                                border: activeCategory === cat ? 'none' : '1px solid var(--color-border)',
                            }}
                        >
                            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Clubs Grid */}
            {loading ? (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px'
                }}>
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} style={{
                            borderRadius: '16px', padding: '20px', height: '180px',
                            backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        }} className="skeleton" />
                    ))}
                </div>
            ) : filtered.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '64px 20px', borderRadius: '16px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)',
                    }}>
                        <Users size={32} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                        No clubs found
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                        Try a different search or create one!
                    </p>
                </div>
            ) : (
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px'
                }}>
                    {filtered.map(club => (
                        <div key={club.id} className="hover-lift" style={{
                            borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column',
                            backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                            transition: 'transform 0.2s, box-shadow 0.2s',
                        }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px', flexShrink: 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    background: club.avatar_url ? `url(${club.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                    color: 'white', fontSize: '18px', fontWeight: 700,
                                }}>
                                    {!club.avatar_url && club.name[0]}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '16px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {club.name}
                                    </h3>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                        <span style={{
                                            fontSize: '11px', padding: '2px 8px', borderRadius: '99px', fontWeight: 500,
                                            backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                                        }}>
                                            {club.category}
                                        </span>
                                        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                            {club.members_count} members
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <p style={{
                                fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6,
                                marginBottom: '16px', flex: 1,
                                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                            }}>
                                {club.description || 'No description yet.'}
                            </p>

                            <button
                                onClick={() => handleJoin(club.id)}
                                style={{
                                    width: '100%', padding: '10px', borderRadius: '12px', fontSize: '14px', fontWeight: 600,
                                    transition: 'all 0.2s', cursor: 'pointer',
                                    backgroundColor: club.is_member ? 'var(--color-bg-elevated)' : 'var(--color-primary)',
                                    color: club.is_member ? 'var(--color-text-secondary)' : 'white',
                                    border: club.is_member ? '1px solid var(--color-border)' : 'none',
                                }}
                            >
                                {club.is_member ? 'Joined ✓' : 'Join Club'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
