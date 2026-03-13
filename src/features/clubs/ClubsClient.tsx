'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Plus, Search, Users } from 'lucide-react'
import { Club } from '@/lib/types'
import { useAuth } from '@/components/providers/AuthProvider'
import { fetchJson } from '@/lib/query/fetch-json'

const categories = ['all', 'tech', 'arts', 'sports', 'academic', 'social', 'cultural'] as const
const clubsKey = ['clubs'] as const

export default function ClubsClient({ initialClubs }: { initialClubs: Club[] }) {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    const [search, setSearch] = useState('')
    const [category, setCategory] = useState<string>('all')
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ name: '', description: '', category: 'general' })

    const clubsQuery = useQuery({
        queryKey: clubsKey,
        queryFn: () => fetchJson<Club[]>('/api/clubs', { cache: 'no-store' }),
        initialData: initialClubs,
        staleTime: 300_000,
    })

    const createMutation = useMutation({
        mutationFn: () => fetchJson<Club>('/api/clubs', { method: 'POST', body: JSON.stringify(form) }),
        onSuccess: (club) => {
            queryClient.setQueryData(clubsKey, (current: Club[] | undefined) => [club, ...(current ?? [])])
            setForm({ name: '', description: '', category: 'general' })
            setShowCreate(false)
        },
    })

    const membershipMutation = useMutation({
        mutationFn: (clubId: string) => fetchJson<{ clubId: string; isMember: boolean; membersCount: number }>('/api/clubs', { method: 'PATCH', body: JSON.stringify({ clubId }) }),
        onMutate: async (clubId) => {
            const previous = queryClient.getQueryData<Club[]>(clubsKey) ?? []
            queryClient.setQueryData(clubsKey, previous.map((club) => club.id === clubId ? { ...club, is_member: !club.is_member, members_count: club.members_count + (club.is_member ? -1 : 1) } : club))
            return { previous }
        },
        onError: (_error, _clubId, context) => {
            if (context?.previous) queryClient.setQueryData(clubsKey, context.previous)
        },
        onSuccess: (result) => {
            queryClient.setQueryData(clubsKey, (current: Club[] | undefined) => (current ?? []).map((club) => club.id === result.clubId ? { ...club, is_member: result.isMember, members_count: result.membersCount } : club))
        },
    })

    const filtered = useMemo(() => {
        const needle = search.trim().toLowerCase()
        return (clubsQuery.data ?? []).filter((club) => {
            const matchesCategory = category === 'all' || club.category === category
            const matchesSearch = !needle || club.name.toLowerCase().includes(needle) || (club.description || '').toLowerCase().includes(needle)
            return matchesCategory && matchesSearch
        })
    }, [clubsQuery.data, category, search])

    return (
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'grid', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: 0 }}>Clubs</h1>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: '4px 0 0 0' }}>Loaded once, filtered locally, and cached for the whole session.</p>
                </div>
                <button onClick={() => setShowCreate((prev) => !prev)} style={{ border: 'none', borderRadius: '14px', padding: '10px 16px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Plus size={16} /> Create club
                </button>
            </div>

            {showCreate && (
                <div style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '18px', display: 'grid', gap: '12px' }}>
                    <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Club name" style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', outline: 'none' }} />
                    <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} rows={3} placeholder="What is this club about?" style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', outline: 'none', resize: 'vertical' }} />
                    <select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} style={{ padding: '12px 14px', borderRadius: '12px', border: '1px solid var(--color-border)', background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', outline: 'none' }}>
                        {categories.filter((item) => item !== 'all').map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button onClick={() => setShowCreate(false)} style={{ border: 'none', background: 'transparent', color: 'var(--color-text-muted)', padding: '10px 12px', cursor: 'pointer' }}>Cancel</button>
                        <button onClick={() => createMutation.mutate()} disabled={!form.name.trim() || createMutation.isPending} style={{ border: 'none', borderRadius: '12px', padding: '10px 16px', background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white', cursor: 'pointer', opacity: !form.name.trim() || createMutation.isPending ? 0.6 : 1 }}>
                            {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'grid', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', borderRadius: '14px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)' }}>
                    <Search size={16} style={{ color: 'var(--color-text-muted)' }} />
                    <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search clubs" style={{ width: '100%', border: 'none', background: 'transparent', outline: 'none', color: 'var(--color-text-primary)' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {categories.map((item) => (
                        <button key={item} onClick={() => setCategory(item)} style={{ border: 'none', borderRadius: '999px', padding: '8px 12px', cursor: 'pointer', background: category === item ? 'var(--color-primary)' : 'var(--color-bg-card)', color: category === item ? 'white' : 'var(--color-text-secondary)' }}>
                            {item}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gap: '14px', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                {filtered.map((club) => (
                    <article key={club.id} style={{ background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '18px', display: 'grid', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: club.avatar_url ? `url(${club.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '18px' }}>
                                {!club.avatar_url && club.name[0]}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '16px', fontWeight: 700 }}>{club.name}</div>
                                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{club.category} · {club.members_count} members</div>
                            </div>
                        </div>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{club.description || 'No description yet.'}</p>
                        <button onClick={() => user && membershipMutation.mutate(club.id)} disabled={!user || membershipMutation.isPending} style={{ border: 'none', borderRadius: '12px', padding: '10px 14px', background: club.is_member ? 'var(--color-bg-elevated)' : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: club.is_member ? 'var(--color-text-secondary)' : 'white', cursor: 'pointer' }}>
                            {club.is_member ? 'Joined' : 'Join club'}
                        </button>
                    </article>
                ))}
                {filtered.length === 0 && <div style={{ gridColumn: '1 / -1', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}><Users size={24} style={{ marginBottom: '12px' }} />No clubs found.</div>}
            </div>
        </div>
    )
}

