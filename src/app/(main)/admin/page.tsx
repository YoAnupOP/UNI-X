'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { Profile, Club, Event, Announcement, Post } from '@/lib/types'
import {
    Shield, Users, Calendar, Megaphone, BarChart3, UserX, Loader2, Plus, Trash2,
    MessageSquare, TrendingUp, AlertTriangle, Edit3, Power, ExternalLink,
    FileText, Image as ImageIcon, MessageCircle,
} from 'lucide-react'
import { getStaleCache, setCache } from '@/lib/cache'
import {
    AdminSearchBar, ConfirmModal, StatusBadge, AdminPagination,
    AdminToast, EmptyState, AdminCard, AdminSelect,
} from './components'

type Tab = 'overview' | 'users' | 'clubs' | 'events' | 'announcements' | 'moderation'
type ModerationSubTab = 'post' | 'comment' | 'wall'

interface ModerationItem {
    id: string
    content?: string
    image_url?: string
    created_at: string
    likes_count?: number
    comments_count?: number
    author?: { full_name?: string; username?: string }
    post?: { content?: string }
}

// ── API helpers ──────────────────────────────────────────
async function api<T = unknown>(url: string, opts?: RequestInit): Promise<{ data?: T; error?: string }> {
    try {
        const res = await fetch(url, opts)
        const json = await res.json()
        if (!res.ok) return { error: json.error || 'Request failed' }
        return { data: json as T }
    } catch {
        return { error: 'Network error' }
    }
}

export default function AdminPage() {
    const { profile } = useAuth()
    const router = useRouter()
    const supabase = createClient()

    // ── Tab state ──
    const [activeTab, setActiveTab] = useState<Tab>('overview')

    // ── Overview ──
    const [stats, setStats] = useState(() =>
        getStaleCache<{ users: number; posts: number; clubs: number; events: number }>('admin-stats')
        || { users: 0, posts: 0, clubs: 0, events: 0 }
    )
    const [recentUsers, setRecentUsers] = useState<Profile[]>([])
    const [recentPosts, setRecentPosts] = useState<Post[]>([])
    const [recentAnnouncements, setRecentAnnouncements] = useState<Announcement[]>([])
    const [loading, setLoading] = useState(() => !getStaleCache('admin-stats'))

    // ── Users ──
    const [users, setUsers] = useState<Profile[]>([])
    const [usersTotal, setUsersTotal] = useState(0)
    const [usersPage, setUsersPage] = useState(1)
    const [usersSearch, setUsersSearch] = useState('')
    const [usersRoleFilter, setUsersRoleFilter] = useState('')
    const [usersLoading, setUsersLoading] = useState(false)

    // ── Clubs ──
    const [clubs, setClubs] = useState<Club[]>([])
    const [clubsTotal, setClubsTotal] = useState(0)
    const [clubsPage, setClubsPage] = useState(1)
    const [clubsSearch, setClubsSearch] = useState('')
    const [clubsCategoryFilter, setClubsCategoryFilter] = useState('')
    const [clubsLoading, setClubsLoading] = useState(false)

    // ── Events ──
    const [events, setEvents] = useState<Event[]>([])
    const [eventsTotal, setEventsTotal] = useState(0)
    const [eventsPage, setEventsPage] = useState(1)
    const [eventsSearch, setEventsSearch] = useState('')
    const [eventsFilter, setEventsFilter] = useState('all')
    const [eventsLoading, setEventsLoading] = useState(false)
    const [showCreateEvent, setShowCreateEvent] = useState(false)
    const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', start_date: '', end_date: '' })

    // ── Announcements ──
    const [announcements, setAnnouncements] = useState<Announcement[]>([])
    const [announcementsTotal, setAnnouncementsTotal] = useState(0)
    const [announcementsPage, setAnnouncementsPage] = useState(1)
    const [announcementsLoading, setAnnouncementsLoading] = useState(false)
    const [showCreateAnnouncement, setShowCreateAnnouncement] = useState(false)
    const [newAnnouncement, setNewAnnouncement] = useState({ title: '', content: '', priority: 'normal' })
    const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null)

    // ── Moderation ──
    const [modSubTab, setModSubTab] = useState<ModerationSubTab>('post')
    const [modItems, setModItems] = useState<ModerationItem[]>([])
    const [modTotal, setModTotal] = useState(0)
    const [modPage, setModPage] = useState(1)
    const [modSearch, setModSearch] = useState('')
    const [modLoading, setModLoading] = useState(false)

    // ── Shared UI state ──
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
    const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; onConfirm: () => Promise<void> } | null>(null)
    const [confirmLoading, setConfirmLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    // ── Auth guard ──
    useEffect(() => {
        if (profile && profile.role !== 'admin') router.push('/feed')
    }, [profile, router])

    // ── Overview data ──
    const fetchOverview = useCallback(async () => {
        try {
            const [usersRes, postsRes, clubsRes, eventsRes] = await Promise.all([
                supabase.from('profiles').select('*', { count: 'exact', head: false }).order('created_at', { ascending: false }).limit(5),
                supabase.from('posts').select('*, author:profiles!author_id(id, full_name, username)', { count: 'exact' }).order('created_at', { ascending: false }).limit(5),
                supabase.from('clubs').select('*', { count: 'exact', head: true }),
                supabase.from('events').select('*', { count: 'exact', head: true }),
            ])
            const announcementsRes = await supabase.from('announcements').select('*, author:profiles!author_id(id, full_name)').order('created_at', { ascending: false }).limit(5)

            const newStats = {
                users: usersRes.count || 0,
                posts: postsRes.count || 0,
                clubs: clubsRes.count || 0,
                events: eventsRes.count || 0,
            }
            setStats(newStats)
            setRecentUsers(usersRes.data as Profile[] || [])
            setRecentPosts(postsRes.data as Post[] || [])
            setRecentAnnouncements(announcementsRes.data as Announcement[] || [])
            setCache('admin-stats', newStats)
        } catch (e) {
            console.error('Failed to fetch overview:', e)
        } finally {
            setLoading(false)
        }
    }, [supabase])

    useEffect(() => { fetchOverview() }, [fetchOverview])

    // ── Users data ──
    const fetchUsers = useCallback(async () => {
        setUsersLoading(true)
        const params = new URLSearchParams({ page: String(usersPage), limit: '15' })
        if (usersSearch) params.set('q', usersSearch)
        if (usersRoleFilter) params.set('role', usersRoleFilter)
        const { data } = await api<{ data: Profile[]; total: number }>(`/api/admin/users?${params}`)
        if (data) { setUsers(data.data); setUsersTotal(data.total) }
        setUsersLoading(false)
    }, [usersPage, usersSearch, usersRoleFilter])

    useEffect(() => { if (activeTab === 'users') fetchUsers() }, [fetchUsers, activeTab])

    const handleChangeRole = async (userId: string, role: string) => {
        setActionLoading(userId)
        const { error } = await api('/api/admin/users', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role }),
        })
        if (error) { setToast({ message: error, type: 'error' }) }
        else { setToast({ message: 'Role updated', type: 'success' }); fetchUsers() }
        setActionLoading(null)
    }

    const handleDeleteUser = (userId: string, name: string) => {
        setConfirmAction({
            title: 'Delete User',
            message: `This will permanently delete "${name}" and all their content. This cannot be undone.`,
            onConfirm: async () => {
                const { error } = await api(`/api/admin/users?id=${userId}`, { method: 'DELETE' })
                if (error) setToast({ message: error, type: 'error' })
                else { setToast({ message: 'User deleted', type: 'success' }); fetchUsers(); fetchOverview() }
            },
        })
    }

    // ── Clubs data ──
    const fetchClubs = useCallback(async () => {
        setClubsLoading(true)
        const params = new URLSearchParams({ page: String(clubsPage), limit: '15' })
        if (clubsSearch) params.set('q', clubsSearch)
        if (clubsCategoryFilter) params.set('category', clubsCategoryFilter)
        const { data } = await api<{ data: Club[]; total: number }>(`/api/admin/clubs?${params}`)
        if (data) { setClubs(data.data); setClubsTotal(data.total) }
        setClubsLoading(false)
    }, [clubsPage, clubsSearch, clubsCategoryFilter])

    useEffect(() => { if (activeTab === 'clubs') fetchClubs() }, [fetchClubs, activeTab])

    const handleToggleClub = async (clubId: string, currentActive: boolean) => {
        setActionLoading(clubId)
        const { error } = await api('/api/admin/clubs', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clubId, is_active: !currentActive }),
        })
        if (error) setToast({ message: error, type: 'error' })
        else { setToast({ message: currentActive ? 'Club deactivated' : 'Club activated', type: 'success' }); fetchClubs() }
        setActionLoading(null)
    }

    const handleDeleteClub = (clubId: string, name: string) => {
        setConfirmAction({
            title: 'Delete Club',
            message: `Delete "${name}" and all its members/posts? This cannot be undone.`,
            onConfirm: async () => {
                const { error } = await api(`/api/admin/clubs?id=${clubId}`, { method: 'DELETE' })
                if (error) setToast({ message: error, type: 'error' })
                else { setToast({ message: 'Club deleted', type: 'success' }); fetchClubs(); fetchOverview() }
            },
        })
    }

    // ── Events data ──
    const fetchEvents = useCallback(async () => {
        setEventsLoading(true)
        const params = new URLSearchParams({ page: String(eventsPage), limit: '15', filter: eventsFilter })
        if (eventsSearch) params.set('q', eventsSearch)
        const { data } = await api<{ data: Event[]; total: number }>(`/api/admin/events?${params}`)
        if (data) { setEvents(data.data); setEventsTotal(data.total) }
        setEventsLoading(false)
    }, [eventsPage, eventsSearch, eventsFilter])

    useEffect(() => { if (activeTab === 'events') fetchEvents() }, [fetchEvents, activeTab])

    const handleCreateEvent = async () => {
        if (!newEvent.title.trim() || !newEvent.start_date) return
        setActionLoading('create-event')
        const { error } = await api('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newEvent),
        })
        if (error) setToast({ message: error, type: 'error' })
        else {
            setToast({ message: 'Event created', type: 'success' })
            setNewEvent({ title: '', description: '', location: '', start_date: '', end_date: '' })
            setShowCreateEvent(false)
            fetchEvents(); fetchOverview()
        }
        setActionLoading(null)
    }

    const handleToggleEvent = async (eventId: string, currentActive: boolean) => {
        setActionLoading(eventId)
        const { error } = await api('/api/admin/events', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventId, is_active: !currentActive }),
        })
        if (error) setToast({ message: error, type: 'error' })
        else { setToast({ message: currentActive ? 'Event deactivated' : 'Event activated', type: 'success' }); fetchEvents() }
        setActionLoading(null)
    }

    const handleDeleteEvent = (eventId: string, title: string) => {
        setConfirmAction({
            title: 'Delete Event',
            message: `Delete "${title}" and all RSVPs? This cannot be undone.`,
            onConfirm: async () => {
                const { error } = await api(`/api/admin/events?id=${eventId}`, { method: 'DELETE' })
                if (error) setToast({ message: error, type: 'error' })
                else { setToast({ message: 'Event deleted', type: 'success' }); fetchEvents(); fetchOverview() }
            },
        })
    }

    // ── Announcements data ──
    const fetchAnnouncements = useCallback(async () => {
        setAnnouncementsLoading(true)
        const params = new URLSearchParams({ page: String(announcementsPage), limit: '15' })
        const { data } = await api<{ data: Announcement[]; total: number }>(`/api/admin/announcements?${params}`)
        if (data) { setAnnouncements(data.data); setAnnouncementsTotal(data.total) }
        setAnnouncementsLoading(false)
    }, [announcementsPage])

    useEffect(() => { if (activeTab === 'announcements') fetchAnnouncements() }, [fetchAnnouncements, activeTab])

    const handleCreateAnnouncement = async () => {
        if (!newAnnouncement.title.trim() || !newAnnouncement.content.trim()) return
        setActionLoading('create-announcement')
        const { error } = await api('/api/admin/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newAnnouncement),
        })
        if (error) setToast({ message: error, type: 'error' })
        else {
            setToast({ message: 'Announcement published', type: 'success' })
            setNewAnnouncement({ title: '', content: '', priority: 'normal' })
            setShowCreateAnnouncement(false)
            fetchAnnouncements(); fetchOverview()
        }
        setActionLoading(null)
    }

    const handleEditAnnouncement = async () => {
        if (!editingAnnouncement) return
        setActionLoading(editingAnnouncement.id)
        const { error } = await api('/api/admin/announcements', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                announcementId: editingAnnouncement.id,
                title: editingAnnouncement.title,
                content: editingAnnouncement.content,
                priority: editingAnnouncement.priority,
            }),
        })
        if (error) setToast({ message: error, type: 'error' })
        else { setToast({ message: 'Announcement updated', type: 'success' }); setEditingAnnouncement(null); fetchAnnouncements() }
        setActionLoading(null)
    }

    const handleToggleAnnouncement = async (id: string, currentActive: boolean) => {
        setActionLoading(id)
        const { error } = await api('/api/admin/announcements', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ announcementId: id, is_active: !currentActive }),
        })
        if (error) setToast({ message: error, type: 'error' })
        else { setToast({ message: currentActive ? 'Announcement hidden' : 'Announcement visible', type: 'success' }); fetchAnnouncements() }
        setActionLoading(null)
    }

    const handleDeleteAnnouncement = (id: string, title: string) => {
        setConfirmAction({
            title: 'Delete Announcement',
            message: `Delete "${title}"? This cannot be undone.`,
            onConfirm: async () => {
                const { error } = await api(`/api/admin/announcements?id=${id}`, { method: 'DELETE' })
                if (error) setToast({ message: error, type: 'error' })
                else { setToast({ message: 'Announcement deleted', type: 'success' }); fetchAnnouncements(); fetchOverview() }
            },
        })
    }

    // ── Moderation data ──
    const fetchModeration = useCallback(async () => {
        setModLoading(true)
        const params = new URLSearchParams({ type: modSubTab, page: String(modPage), limit: '15' })
        if (modSearch) params.set('q', modSearch)
        const { data } = await api<{ data: ModerationItem[]; total: number }>(`/api/admin/moderation?${params}`)
        if (data) { setModItems(data.data); setModTotal(data.total) }
        setModLoading(false)
    }, [modSubTab, modPage, modSearch])

    useEffect(() => { if (activeTab === 'moderation') fetchModeration() }, [fetchModeration, activeTab])

    const handleDeleteContent = (type: ModerationSubTab, id: string) => {
        const labels = { post: 'Post', comment: 'Comment', wall: 'Wall Post' }
        setConfirmAction({
            title: `Delete ${labels[type]}`,
            message: `This will permanently remove this ${labels[type].toLowerCase()}. This cannot be undone.`,
            onConfirm: async () => {
                const { error } = await api(`/api/admin/moderation?type=${type}&id=${id}`, { method: 'DELETE' })
                if (error) setToast({ message: error, type: 'error' })
                else { setToast({ message: `${labels[type]} deleted`, type: 'success' }); fetchModeration() }
            },
        })
    }

    // ── Reset page on filter change ──
    useEffect(() => { setUsersPage(1) }, [usersSearch, usersRoleFilter])
    useEffect(() => { setClubsPage(1) }, [clubsSearch, clubsCategoryFilter])
    useEffect(() => { setEventsPage(1) }, [eventsSearch, eventsFilter])
    useEffect(() => { setModPage(1) }, [modSearch, modSubTab])

    // ── Tab config ──
    const tabs: { id: Tab; label: string; icon: typeof Shield }[] = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'clubs', label: 'Clubs', icon: Users },
        { id: 'events', label: 'Events', icon: Calendar },
        { id: 'announcements', label: 'Announcements', icon: Megaphone },
        { id: 'moderation', label: 'Moderation', icon: AlertTriangle },
    ]

    if (profile?.role !== 'admin') return null

    const inputStyle = {
        backgroundColor: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)',
    }

    return (
        <div className="admin-panel w-full" style={{ maxWidth: '1100px', margin: '0 auto' }}>
            {/* Header */}
            <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                        boxShadow: '0 0 24px rgba(139,92,246,0.25)',
                        flexShrink: 0,
                    }}>
                        <Shield size={18} style={{ color: 'white' }} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', lineHeight: 1.2 }}>Admin Panel</h1>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>Manage your university platform</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="admin-tabs" style={{
                display: 'flex', gap: '0px', overflowX: 'auto',
                scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' as const,
                marginBottom: '24px', borderBottom: '1px solid var(--color-border)',
            }}>
                {tabs.map(tab => {
                    const Icon = tab.icon
                    const isActive = activeTab === tab.id
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="admin-tab-btn"
                            style={{
                                display: 'flex', alignItems: 'center', gap: '7px',
                                padding: '10px 16px',
                                fontSize: '13px', fontWeight: isActive ? 600 : 500,
                                whiteSpace: 'nowrap',
                                color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                                borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent',
                                background: 'none',
                                borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                                borderRadius: 0,
                                transition: 'all 0.2s ease',
                                marginBottom: '-1px',
                                cursor: 'pointer',
                            }}
                        >
                            <Icon size={15} /> <span className="admin-tab-label">{tab.label}</span>
                        </button>
                    )
                })}
            </div>

            {loading && activeTab === 'overview' ? (
                <div className="flex justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
            ) : (
                <>
                    {/* ════════════════ OVERVIEW ════════════════ */}
                    {activeTab === 'overview' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                            {/* Stat Cards */}
                            <div className="admin-stats-grid">
                                {[
                                    { label: 'Total Users', value: stats.users, icon: Users, color: '#8B5CF6', glow: 'rgba(139,92,246,0.08)' },
                                    { label: 'Total Posts', value: stats.posts, icon: MessageSquare, color: '#38BDF8', glow: 'rgba(56,189,248,0.08)' },
                                    { label: 'Active Clubs', value: stats.clubs, icon: TrendingUp, color: '#34D399', glow: 'rgba(52,211,153,0.08)' },
                                    { label: 'Events', value: stats.events, icon: Calendar, color: '#FB923C', glow: 'rgba(251,146,60,0.08)' },
                                ].map(stat => {
                                    const Icon = stat.icon
                                    return (
                                        <AdminCard key={stat.label} style={{ padding: '20px' }} glow={stat.glow}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>{stat.label}</p>
                                                    <p style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', lineHeight: 1, color: 'var(--color-text-primary)' }}>{stat.value}</p>
                                                </div>
                                                <div style={{
                                                    width: '42px', height: '42px', borderRadius: '12px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    flexShrink: 0,
                                                    background: stat.color === '#8B5CF6' ? 'rgba(139,92,246,0.12)' : stat.color === '#38BDF8' ? 'rgba(56,189,248,0.12)' : stat.color === '#34D399' ? 'rgba(52,211,153,0.12)' : 'rgba(251,146,60,0.12)',
                                                    border: stat.color === '#8B5CF6' ? '1px solid rgba(139,92,246,0.2)' : stat.color === '#38BDF8' ? '1px solid rgba(56,189,248,0.2)' : stat.color === '#34D399' ? '1px solid rgba(52,211,153,0.2)' : '1px solid rgba(251,146,60,0.2)',
                                                }}>
                                                    <Icon size={20} style={{ color: stat.color }} />
                                                </div>
                                            </div>
                                        </AdminCard>
                                    )
                                })}
                            </div>

                            {/* Recent Activity */}
                            <div className="admin-activity-grid">
                                {/* Recent Users */}
                                <AdminCard className="admin-activity-card">
                                    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(139,92,246,0.1)' }}>
                                                <Users size={14} style={{ color: '#8B5CF6' }} />
                                            </div>
                                            <h3 style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Recent Signups</h3>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 12px 14px' }}>
                                        {recentUsers.length === 0 ? (
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '20px 0', textAlign: 'center' }}>No recent signups</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {recentUsers.slice(0, 5).map(u => (
                                                    <div key={u.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '7px 8px', borderRadius: '10px', transition: 'background 0.15s',
                                                    }} className="admin-list-item">
                                                        <div style={{
                                                            width: '32px', height: '32px', borderRadius: '10px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: '11px', fontWeight: 700, flexShrink: 0,
                                                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white',
                                                        }}>
                                                            {u.full_name?.[0] || '?'}
                                                        </div>
                                                        <div style={{ minWidth: 0, flex: 1 }}>
                                                            <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>{u.full_name || 'Unknown'}</p>
                                                            {u.username && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', lineHeight: 1.2 }}>@{u.username}</p>}
                                                        </div>
                                                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', flexShrink: 0 }}>
                                                            {new Date(u.created_at).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </AdminCard>

                                {/* Recent Posts */}
                                <AdminCard className="admin-activity-card">
                                    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(56,189,248,0.1)' }}>
                                                <MessageSquare size={14} style={{ color: '#38BDF8' }} />
                                            </div>
                                            <h3 style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Recent Posts</h3>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 12px 14px' }}>
                                        {recentPosts.length === 0 ? (
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '20px 0', textAlign: 'center' }}>No recent posts</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {recentPosts.slice(0, 5).map(p => (
                                                    <div key={p.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '7px 8px', borderRadius: '10px', transition: 'background 0.15s',
                                                    }} className="admin-list-item">
                                                        <div style={{
                                                            width: '30px', height: '30px', borderRadius: '10px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0, backgroundColor: 'var(--color-bg-elevated)',
                                                        }}>
                                                            <MessageSquare size={13} style={{ color: 'var(--color-text-muted)' }} />
                                                        </div>
                                                        <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)', minWidth: 0, flex: 1 }}>
                                                            {p.content?.slice(0, 80) || 'No content'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </AdminCard>

                                {/* Recent Announcements */}
                                <AdminCard className="admin-activity-card">
                                    <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--color-border)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(251,146,60,0.1)' }}>
                                                <Megaphone size={14} style={{ color: '#FB923C' }} />
                                            </div>
                                            <h3 style={{ fontSize: '13px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}>Recent Announcements</h3>
                                        </div>
                                    </div>
                                    <div style={{ padding: '10px 12px 14px' }}>
                                        {recentAnnouncements.length === 0 ? (
                                            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', padding: '20px 0', textAlign: 'center' }}>No announcements yet</p>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                {recentAnnouncements.slice(0, 5).map(a => (
                                                    <div key={a.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '7px 8px', borderRadius: '10px', transition: 'background 0.15s',
                                                    }} className="admin-list-item">
                                                        <div style={{
                                                            width: '30px', height: '30px', borderRadius: '10px',
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            flexShrink: 0, backgroundColor: 'var(--color-bg-elevated)',
                                                        }}>
                                                            <Megaphone size={13} style={{ color: 'var(--color-text-muted)' }} />
                                                        </div>
                                                        <span style={{ fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{a.title}</span>
                                                        <StatusBadge value={a.priority} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </AdminCard>
                            </div>

                            {/* Quick Actions */}
                            <AdminCard style={{ padding: '20px' }}>
                                <p style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Quick Actions</p>
                                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                    <button
                                        onClick={() => { setActiveTab('announcements'); setShowCreateAnnouncement(true) }}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white"
                                        style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', boxShadow: '0 4px 16px rgba(139,92,246,0.25)', transition: 'all 0.2s ease' }}
                                    >
                                        <Plus size={15} /> New Announcement
                                    </button>
                                    <button
                                        onClick={() => { setActiveTab('events'); setShowCreateEvent(true) }}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                                        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', transition: 'all 0.2s ease' }}
                                    >
                                        <Calendar size={15} /> New Event
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('moderation')}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                                        style={{ backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)', transition: 'all 0.2s ease' }}
                                    >
                                        <AlertTriangle size={15} /> Moderate Content
                                    </button>
                                </div>
                            </AdminCard>
                        </div>
                    )}

                    {/* ════════════════ USERS ════════════════ */}
                    {activeTab === 'users' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                                <AdminSearchBar value={usersSearch} onChange={setUsersSearch} placeholder="Search users..." />
                                <AdminSelect
                                    value={usersRoleFilter}
                                    onChange={setUsersRoleFilter}
                                    placeholder="All Roles"
                                    options={[
                                        { value: 'student', label: 'Student' },
                                        { value: 'moderator', label: 'Moderator' },
                                        { value: 'admin', label: 'Admin' },
                                    ]}
                                />
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto', fontWeight: 500 }}>{usersTotal} users</span>
                            </div>

                            {usersLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
                            ) : users.length === 0 ? (
                                <EmptyState message="No users found" />
                            ) : (
                                <AdminCard>
                                    <div style={{ overflowX: 'auto' }}>
                                        <table className="admin-user-table" style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Joined</th>
                                                    <th style={{ textAlign: 'right', padding: '12px 16px', fontWeight: 600, fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map(u => (
                                                    <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="admin-table-row">
                                                        <td className="user-cell" style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div style={{
                                                                    width: '34px', height: '34px', borderRadius: '10px',
                                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                    fontSize: '12px', fontWeight: 700, flexShrink: 0,
                                                                    background: u.avatar_url ? `url(${u.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                                    color: 'white',
                                                                }}>
                                                                    {!u.avatar_url && (u.full_name?.[0] || '?')}
                                                                </div>
                                                                <div style={{ minWidth: 0 }}>
                                                                    <p style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name || 'Unknown'}</p>
                                                                    {u.username && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '1px' }}>@{u.username}</p>}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="email-cell" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{u.email}</td>
                                                        <td className="role-cell" style={{ padding: '12px 16px' }}>
                                                            {u.id === profile?.id ? (
                                                                <StatusBadge value={u.role} />
                                                            ) : (
                                                                    <select
                                                                    value={u.role}
                                                                    onChange={e => handleChangeRole(u.id, e.target.value)}
                                                                    disabled={actionLoading === u.id}
                                                                    style={{
                                                                        ...inputStyle,
                                                                        padding: '4px 8px',
                                                                        borderRadius: '8px',
                                                                        fontSize: '11px',
                                                                        fontWeight: 600,
                                                                        cursor: actionLoading === u.id ? 'wait' : 'pointer',
                                                                        opacity: actionLoading === u.id ? 0.5 : 1,
                                                                    }}
                                                                >
                                                                    <option value="student">Student</option>
                                                                    <option value="moderator">Moderator</option>
                                                                    <option value="admin">Admin</option>
                                                                </select>
                                                            )}
                                                        </td>
                                                        <td className="joined-cell" style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--color-text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                                                        <td className="actions-cell" style={{ padding: '12px 16px' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '4px' }}>
                                                                <button
                                                                    onClick={() => router.push(`/profile/${u.id}`)}
                                                                    title="View Profile"
                                                                    style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                                                                >
                                                                    <ExternalLink size={14} />
                                                                </button>
                                                                {u.id !== profile?.id && (
                                                                    <button
                                                                        onClick={() => handleDeleteUser(u.id, u.full_name || 'this user')}
                                                                        title="Delete User"
                                                                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                                                                    >
                                                                        <UserX size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </AdminCard>
                            )}
                            <AdminPagination page={usersPage} total={usersTotal} limit={15} onPageChange={setUsersPage} />
                        </div>
                    )}

                    {/* ════════════════ CLUBS ════════════════ */}
                    {activeTab === 'clubs' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                                <AdminSearchBar value={clubsSearch} onChange={setClubsSearch} placeholder="Search clubs..." />
                                <AdminSelect
                                    value={clubsCategoryFilter}
                                    onChange={setClubsCategoryFilter}
                                    placeholder="All Categories"
                                    options={[
                                        { value: 'general', label: 'General' },
                                        { value: 'tech', label: 'Tech' },
                                        { value: 'arts', label: 'Arts' },
                                        { value: 'sports', label: 'Sports' },
                                        { value: 'academic', label: 'Academic' },
                                        { value: 'social', label: 'Social' },
                                        { value: 'cultural', label: 'Cultural' },
                                    ]}
                                />
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto', fontWeight: 500 }}>{clubsTotal} clubs</span>
                            </div>

                            {clubsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
                            ) : clubs.length === 0 ? (
                                <EmptyState message="No clubs found" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {clubs.map(c => (
                                        <AdminCard key={c.id} style={{ padding: '16px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                                                    <div style={{
                                                        width: '42px', height: '42px', borderRadius: '12px',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 700, fontSize: '16px', flexShrink: 0,
                                                        background: c.avatar_url ? `url(${c.avatar_url}) center/cover` : 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                        color: 'white',
                                                    }}>
                                                        {!c.avatar_url && c.name[0]}
                                                    </div>
                                                    <div style={{ minWidth: 0 }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                                            <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</p>
                                                            <StatusBadge value={c.is_active ? 'active' : 'inactive'} />
                                                        </div>
                                                        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                            {c.members_count} members • {c.category}
                                                            {c.admin && ` • Admin: ${(c.admin as Profile).full_name || (c.admin as Profile).username}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                    <button
                                                        onClick={() => handleToggleClub(c.id, c.is_active)}
                                                        disabled={actionLoading === c.id}
                                                        title={c.is_active ? 'Deactivate' : 'Activate'}
                                                        style={{ padding: '6px', borderRadius: '8px', color: c.is_active ? 'var(--color-text-muted)' : '#34D399', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Power size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteClub(c.id, c.name)}
                                                        title="Delete Club"
                                                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </AdminCard>
                                    ))}
                                </div>
                            )}
                            <AdminPagination page={clubsPage} total={clubsTotal} limit={15} onPageChange={setClubsPage} />
                        </div>
                    )}

                    {/* ════════════════ EVENTS ════════════════ */}
                    {activeTab === 'events' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                                <AdminSearchBar value={eventsSearch} onChange={setEventsSearch} placeholder="Search events..." />
                                <AdminSelect
                                    value={eventsFilter}
                                    onChange={setEventsFilter}
                                    options={[
                                        { value: 'all', label: 'All Events' },
                                        { value: 'active', label: 'Active / Upcoming' },
                                        { value: 'past', label: 'Past Events' },
                                    ]}
                                />
                                <button
                                    onClick={() => setShowCreateEvent(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '7px',
                                        padding: '9px 18px', borderRadius: '12px',
                                        fontSize: '13px', fontWeight: 600, color: 'white', marginLeft: 'auto',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        boxShadow: '0 4px 12px rgba(139,92,246,0.2)',
                                        border: 'none', cursor: 'pointer',
                                    }}
                                >
                                    <Plus size={15} /> Create Event
                                </button>
                            </div>

                            {/* Create Event Form */}
                            {showCreateEvent && (
                                <AdminCard style={{ padding: '20px 22px' }} className="animate-scale-in">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Create New Event</h3>
                                        <input type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} placeholder="Event Title *" style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }} />
                                        <textarea value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} placeholder="Description" rows={3} style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', resize: 'none' }} />
                                        <div className="admin-form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                                            <input type="text" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })} placeholder="Location" style={{ ...inputStyle, padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }} />
                                            <input type="datetime-local" value={newEvent.start_date} onChange={e => setNewEvent({ ...newEvent, start_date: e.target.value })} style={{ ...inputStyle, padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }} />
                                            <input type="datetime-local" value={newEvent.end_date} onChange={e => setNewEvent({ ...newEvent, end_date: e.target.value })} style={{ ...inputStyle, padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }} />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                            <button onClick={() => setShowCreateEvent(false)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                            <button
                                                onClick={handleCreateEvent}
                                                disabled={actionLoading === 'create-event'}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '7px',
                                                    padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: 'white',
                                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                    opacity: actionLoading === 'create-event' ? 0.7 : 1, border: 'none', cursor: 'pointer',
                                                }}
                                            >
                                                {actionLoading === 'create-event' && <Loader2 size={14} className="animate-spin" />}
                                                Create Event
                                            </button>
                                        </div>
                                    </div>
                                </AdminCard>
                            )}

                            {eventsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
                            ) : events.length === 0 ? (
                                <EmptyState message="No events found" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {events.map(e => (
                                        <AdminCard key={e.id} style={{ padding: '16px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                                        <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</p>
                                                        <StatusBadge value={e.is_active ? 'active' : 'inactive'} />
                                                    </div>
                                                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                                                        {new Date(e.start_date).toLocaleDateString()} \u2022 {e.rsvp_count} RSVPs
                                                        {e.location && ` \u2022 ${e.location}`}
                                                        {e.organizer && ` \u2022 by ${(e.organizer as Profile).full_name || (e.organizer as Profile).username}`}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                    <button
                                                        onClick={() => handleToggleEvent(e.id, e.is_active)}
                                                        disabled={actionLoading === e.id}
                                                        title={e.is_active ? 'Deactivate' : 'Activate'}
                                                        style={{ padding: '6px', borderRadius: '8px', color: e.is_active ? 'var(--color-text-muted)' : '#34D399', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Power size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteEvent(e.id, e.title)}
                                                        title="Delete Event"
                                                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </AdminCard>
                                    ))}
                                </div>
                            )}
                            <AdminPagination page={eventsPage} total={eventsTotal} limit={15} onPageChange={setEventsPage} />
                        </div>
                    )}

                    {/* ════════════════ ANNOUNCEMENTS ════════════════ */}
                    {activeTab === 'announcements' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 500 }}>{announcementsTotal} announcements</span>
                                <button
                                    onClick={() => setShowCreateAnnouncement(true)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '7px',
                                        padding: '9px 18px', borderRadius: '12px',
                                        fontSize: '13px', fontWeight: 600, color: 'white', marginLeft: 'auto',
                                        background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                        boxShadow: '0 4px 12px rgba(139,92,246,0.2)',
                                        border: 'none', cursor: 'pointer',
                                    }}
                                >
                                    <Plus size={15} /> Create Announcement
                                </button>
                            </div>

                            {/* Create Form */}
                            {showCreateAnnouncement && (
                                <AdminCard style={{ padding: '20px 22px' }} className="animate-scale-in">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>New Announcement</h3>
                                        <input type="text" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} placeholder="Title *" style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }} />
                                        <textarea value={newAnnouncement.content} onChange={e => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })} placeholder="Content *" rows={3} style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', resize: 'none' }} />
                                        <select value={newAnnouncement.priority} onChange={e => setNewAnnouncement({ ...newAnnouncement, priority: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}>
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                            <button onClick={() => setShowCreateAnnouncement(false)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                            <button
                                                onClick={handleCreateAnnouncement}
                                                disabled={actionLoading === 'create-announcement'}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '7px',
                                                    padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: 'white',
                                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                    opacity: actionLoading === 'create-announcement' ? 0.7 : 1, border: 'none', cursor: 'pointer',
                                                }}
                                            >
                                                {actionLoading === 'create-announcement' && <Loader2 size={14} className="animate-spin" />}
                                                Publish
                                            </button>
                                        </div>
                                    </div>
                                </AdminCard>
                            )}

                            {/* Edit Form */}
                            {editingAnnouncement && (
                                <AdminCard style={{ padding: '20px 22px' }} className="animate-scale-in">
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        <h3 style={{ fontSize: '14px', fontWeight: 600, fontFamily: 'var(--font-display)' }}>Edit Announcement</h3>
                                        <input type="text" value={editingAnnouncement.title} onChange={e => setEditingAnnouncement({ ...editingAnnouncement, title: e.target.value })} style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }} />
                                        <textarea value={editingAnnouncement.content} onChange={e => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })} rows={3} style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px', resize: 'none' }} />
                                        <select value={editingAnnouncement.priority} onChange={e => setEditingAnnouncement({ ...editingAnnouncement, priority: e.target.value as Announcement['priority'] })} style={{ ...inputStyle, width: '100%', padding: '10px 14px', borderRadius: '12px', fontSize: '13px' }}>
                                            <option value="low">Low</option>
                                            <option value="normal">Normal</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                                            <button onClick={() => setEditingAnnouncement(null)} style={{ padding: '8px 16px', borderRadius: '10px', fontSize: '13px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                                            <button
                                                onClick={handleEditAnnouncement}
                                                disabled={actionLoading === editingAnnouncement.id}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '7px',
                                                    padding: '8px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: 600, color: 'white',
                                                    background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                                    border: 'none', cursor: 'pointer',
                                                }}
                                            >
                                                {actionLoading === editingAnnouncement.id && <Loader2 size={14} className="animate-spin" />}
                                                Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </AdminCard>
                            )}

                            {announcementsLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
                            ) : announcements.length === 0 ? (
                                <EmptyState message="No announcements yet" />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {announcements.map(a => (
                                        <AdminCard key={a.id} style={{ padding: '16px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                                        <StatusBadge value={a.priority} />
                                                        <StatusBadge value={a.is_active ? 'active' : 'inactive'} />
                                                    </div>
                                                    <p style={{ fontSize: '14px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</p>
                                                    <p style={{ fontSize: '12px', marginTop: '3px', color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.content}</p>
                                                    <p style={{ fontSize: '11px', marginTop: '4px', color: 'var(--color-text-muted)' }}>
                                                        {new Date(a.created_at).toLocaleDateString()}
                                                        {a.author && ` \u2022 by ${(a.author as Profile).full_name}`}
                                                    </p>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                                                    <button
                                                        onClick={() => setEditingAnnouncement(a)}
                                                        title="Edit"
                                                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Edit3 size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleToggleAnnouncement(a.id, a.is_active)}
                                                        disabled={actionLoading === a.id}
                                                        title={a.is_active ? 'Hide' : 'Show'}
                                                        style={{ padding: '6px', borderRadius: '8px', color: a.is_active ? 'var(--color-text-muted)' : '#34D399', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Power size={15} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAnnouncement(a.id, a.title)}
                                                        title="Delete"
                                                        style={{ padding: '6px', borderRadius: '8px', color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        </AdminCard>
                                    ))}
                                </div>
                            )}
                            <AdminPagination page={announcementsPage} total={announcementsTotal} limit={15} onPageChange={setAnnouncementsPage} />
                        </div>
                    )}

                    {/* ════════════════ MODERATION ════════════════ */}
                    {activeTab === 'moderation' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px' }}>
                                <AdminSearchBar value={modSearch} onChange={setModSearch} placeholder="Search content..." />
                                <div style={{ display: 'flex', gap: '4px', backgroundColor: 'var(--color-bg-elevated)', borderRadius: '10px', padding: '3px', border: '1px solid var(--color-border)' }}>
                                    {([
                                        { id: 'post' as const, label: 'Posts', icon: FileText },
                                        { id: 'comment' as const, label: 'Comments', icon: MessageCircle },
                                        { id: 'wall' as const, label: 'UniWall', icon: ImageIcon },
                                    ]).map(tab => {
                                        const Icon = tab.icon
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setModSubTab(tab.id)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 14px', borderRadius: '8px',
                                                    fontSize: '12px', fontWeight: 600,
                                                    backgroundColor: modSubTab === tab.id ? 'var(--color-primary)' : 'transparent',
                                                    color: modSubTab === tab.id ? 'white' : 'var(--color-text-muted)',
                                                    border: 'none', cursor: 'pointer',
                                                    transition: 'all 0.15s ease',
                                                }}
                                            >
                                                <Icon size={13} /> {tab.label}
                                            </button>
                                        )
                                    })}
                                </div>
                                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginLeft: 'auto', fontWeight: 500 }}>{modTotal} items</span>
                            </div>

                            {modLoading ? (
                                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}><Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>
                            ) : modItems.length === 0 ? (
                                <EmptyState message={`No ${modSubTab === 'wall' ? 'wall posts' : modSubTab + 's'} found`} />
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {modItems.map((item) => (
                                        <AdminCard key={item.id} style={{ padding: '16px 18px' }}>
                                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                                                <div style={{ minWidth: 0, flex: 1 }}>
                                                    {item.author && (
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                                            <div style={{
                                                                width: '28px', height: '28px', borderRadius: '8px',
                                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                fontSize: '10px', fontWeight: 700, flexShrink: 0,
                                                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))', color: 'white',
                                                            }}>
                                                                {item.author.full_name?.[0] || '?'}
                                                            </div>
                                                            <span style={{ fontSize: '13px', fontWeight: 600 }}>{item.author.full_name || 'Unknown'}</span>
                                                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>@{item.author.username}</span>
                                                        </div>
                                                    )}
                                                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', wordBreak: 'break-word', lineHeight: 1.5 }}>
                                                        {(item.content || '').slice(0, 200)}
                                                        {(item.content || '').length > 200 && '...'}
                                                    </p>
                                                    {item.image_url && (
                                                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                                            <ImageIcon size={12} /> Has image
                                                        </div>
                                                    )}
                                                    {item.post && (
                                                        <p style={{ fontSize: '10px', marginTop: '6px', padding: '4px 8px', borderRadius: '6px', display: 'inline-block', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
                                                            On post: {(item.post.content || '').slice(0, 60)}...
                                                        </p>
                                                    )}
                                                    <p style={{ fontSize: '11px', marginTop: '6px', color: 'var(--color-text-muted)' }}>
                                                        {new Date(item.created_at).toLocaleString()}
                                                        {item.likes_count !== undefined && ` \u2022 ${item.likes_count} likes`}
                                                        {item.comments_count !== undefined && ` \u2022 ${item.comments_count} comments`}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteContent(modSubTab, item.id)}
                                                    title="Delete"
                                                    style={{ padding: '6px', borderRadius: '8px', flexShrink: 0, color: 'var(--color-error)', background: 'none', border: 'none', cursor: 'pointer' }}
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </AdminCard>
                                    ))}
                                </div>
                            )}
                            <AdminPagination page={modPage} total={modTotal} limit={15} onPageChange={setModPage} />
                        </div>
                    )}
                </>
            )}

            {/* ── Confirm Modal ── */}
            <ConfirmModal
                open={!!confirmAction}
                title={confirmAction?.title}
                message={confirmAction?.message || ''}
                confirmLabel="Delete"
                onCancel={() => setConfirmAction(null)}
                loading={confirmLoading}
                onConfirm={async () => {
                    if (!confirmAction) return
                    setConfirmLoading(true)
                    await confirmAction.onConfirm()
                    setConfirmLoading(false)
                    setConfirmAction(null)
                }}
            />

            {/* ── Toast ── */}
            {toast && <AdminToast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

            <style>{`
                .admin-tabs::-webkit-scrollbar { display: none; }
                .admin-card:hover { border-color: var(--color-border-hover) !important; }
                .admin-list-item:hover { background-color: var(--color-bg-elevated); }
                .admin-tab-btn:hover { color: var(--color-text-secondary) !important; }
                .admin-table-row:hover { background-color: var(--color-bg-elevated); }
                .admin-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 14px;
                }
                .admin-activity-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }
                .admin-activity-card {
                    min-height: 220px;
                }
                @media (min-width: 768px) {
                    .admin-stats-grid {
                        grid-template-columns: repeat(4, 1fr);
                        gap: 16px;
                    }
                    .admin-activity-grid {
                        grid-template-columns: repeat(3, 1fr);
                    }
                }
                @media (max-width: 640px) {
                    .admin-tab-label { display: none; }
                    .admin-tab-btn { padding: 8px 10px !important; }
                    .admin-user-table thead { display: none; }
                    .admin-user-table tbody tr {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 8px;
                        padding: 12px 16px;
                        align-items: center;
                    }
                    .admin-user-table tbody tr td { padding: 0 !important; border: none !important; }
                    .admin-user-table tbody tr td.user-cell { flex: 1 1 100%; }
                    .admin-user-table tbody tr td.email-cell { display: none; }
                    .admin-user-table tbody tr td.role-cell { flex: 0 0 auto; }
                    .admin-user-table tbody tr td.joined-cell { flex: 0 0 auto; }
                    .admin-user-table tbody tr td.actions-cell { margin-left: auto; }
                }
            `}</style>
        </div>
    )
}
