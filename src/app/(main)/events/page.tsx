'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Event } from '@/lib/types'
import { Calendar, MapPin, Users, Plus, Clock, Loader2 } from 'lucide-react'
import { useCachedQuery } from '@/lib/useCachedQuery'

export default function EventsPage() {
    const { user, loading: authLoading } = useAuth()
    const supabase = createClient()
    const [showCreate, setShowCreate] = useState(false)
    const [creating, setCreating] = useState(false)
    const [newEvent, setNewEvent] = useState({ title: '', description: '', location: '', start_date: '', end_date: '' })

    const fetchEventsData = useCallback(async () => {
        const { data } = await supabase
            .from('events')
            .select('*, organizer:profiles(*)')
            .eq('is_active', true)
            .order('start_date', { ascending: true })

        if (data && user) {
            const { data: rsvps } = await supabase.from('event_rsvps').select('event_id, status').eq('user_id', user.id)
            const rsvpMap = new Map(rsvps?.map(r => [r.event_id, r.status]))
            return data.map(e => ({ ...e, rsvp_status: rsvpMap.get(e.id) || null })) as Event[]
        }
        return (data as Event[]) ?? null
    }, [user, supabase])

    const { data: events, setData: setEvents, isLoading: loading, refresh: refreshEvents } = useCachedQuery(
        'events-data',
        fetchEventsData,
        [] as Event[],
        { enabled: !authLoading }
    )

    const handleRsvp = async (eventId: string, status: string) => {
        if (!user) return
        const event = events.find(e => e.id === eventId)
        if (!event) return

        const prevStatus = event.rsvp_status
        const prevCount = event.rsvp_count

        // Calculate new RSVP count
        let newCount = prevCount
        if (prevStatus === 'going' && status !== 'going') newCount--
        else if (prevStatus !== 'going' && status === 'going') newCount++

        // Optimistic update — instant UI response
        setEvents(prev => prev.map(e => e.id === eventId
            ? { ...e, rsvp_status: status, rsvp_count: newCount } as Event
            : e
        ))

        try {
            if (prevStatus) {
                await supabase.from('event_rsvps').update({ status }).eq('event_id', eventId).eq('user_id', user.id)
            } else {
                await supabase.from('event_rsvps').insert({ event_id: eventId, user_id: user.id, status })
            }
            if (newCount !== prevCount) {
                await supabase.from('events').update({ rsvp_count: newCount }).eq('id', eventId)
            }
        } catch {
            // Rollback on failure
            setEvents(prev => prev.map(e => e.id === eventId
                ? { ...e, rsvp_status: prevStatus, rsvp_count: prevCount } as Event
                : e
            ))
        }
    }

    const handleCreate = async () => {
        if (!user || !newEvent.title.trim() || !newEvent.start_date) return
        setCreating(true)
        await supabase.from('events').insert({
            title: newEvent.title,
            description: newEvent.description,
            location: newEvent.location,
            start_date: newEvent.start_date,
            end_date: newEvent.end_date || null,
            organizer_id: user.id,
        })
        setNewEvent({ title: '', description: '', location: '', start_date: '', end_date: '' })
        setShowCreate(false)
        setCreating(false)
        refreshEvents(true)
    }

    const formatDate = (date: string) => {
        const d = new Date(date)
        return {
            day: d.getDate(),
            month: d.toLocaleString('en', { month: 'short' }),
            time: d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
        }
    }

    return (
        <div style={{ maxWidth: '896px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700 }}>
                    Events
                </h1>
                <button
                    onClick={() => setShowCreate(!showCreate)}
                    className="hover-lift"
                    style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                        borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white',
                        background: 'var(--color-primary)',
                        border: 'none', cursor: 'pointer',
                    }}
                >
                    <Plus size={16} /> Create Event
                </button>
            </div>

            {/* Create Event Form */}
            {showCreate && (
                <div className="animate-scale-in" style={{
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px',
                }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600 }}>
                        Create Event
                    </h3>
                    <input
                        type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                        placeholder="Event title"
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)', outline: 'none',
                        }}
                    />
                    <textarea
                        value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                        placeholder="Description" rows={3}
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)', resize: 'none', outline: 'none', fontFamily: 'var(--font-body)'
                        }}
                    />
                    <input
                        type="text" value={newEvent.location} onChange={e => setNewEvent({ ...newEvent, location: e.target.value })}
                        placeholder="Location"
                        style={{
                            width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                            backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                            color: 'var(--color-text-primary)', outline: 'none',
                        }}
                    />
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--color-text-muted)' }}>Start Date</label>
                            <input
                                type="datetime-local" value={newEvent.start_date} onChange={e => setNewEvent({ ...newEvent, start_date: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                                    backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)', outline: 'none',
                                }}
                            />
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                            <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--color-text-muted)' }}>End Date</label>
                            <input
                                type="datetime-local" value={newEvent.end_date} onChange={e => setNewEvent({ ...newEvent, end_date: e.target.value })}
                                style={{
                                    width: '100%', padding: '12px 16px', borderRadius: '12px', fontSize: '14px',
                                    backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
                                    color: 'var(--color-text-primary)', outline: 'none',
                                }}
                            />
                        </div>
                    </div>
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
                            onClick={handleCreate} disabled={creating}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 20px',
                                borderRadius: '12px', fontSize: '14px', fontWeight: 600, color: 'white',
                                background: 'var(--color-primary)',
                                border: 'none', cursor: creating ? 'not-allowed' : 'pointer', opacity: creating ? 0.5 : 1,
                            }}
                        >
                            {creating ? <Loader2 size={14} className="animate-spin" /> : 'Create'}
                        </button>
                    </div>
                </div>
            )}

            {/* Events List */}
            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px', height: '100px',
                            backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                        }} className="skeleton" />
                    ))}
                </div>
            ) : events.length === 0 ? (
                <div style={{
                    textAlign: 'center', padding: '64px 20px', borderRadius: '16px',
                    backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '16px', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)',
                    }}>
                        <Calendar size={32} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
                        No events yet
                    </h3>
                    <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>
                        Create the first event!
                    </p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {events.map(event => {
                        const dateInfo = formatDate(event.start_date)
                        return (
                            <div key={event.id} className="hover-lift hover-glow flex-col sm-flex-row" style={{
                                borderRadius: '16px', padding: '20px', display: 'flex', gap: '16px',
                                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                transition: 'all 0.2s ease',
                            }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '16px', flexShrink: 0,
                                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                    backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)',
                                }}>
                                    <span style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, lineHeight: 1 }}>
                                        {dateInfo.day}
                                    </span>
                                    <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase' }}>
                                        {dateInfo.month}
                                    </span>
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '18px', fontWeight: 600, marginBottom: '6px' }}>
                                        {event.title}
                                    </h3>
                                    <div style={{
                                        display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px',
                                        fontSize: '13px', color: 'var(--color-text-muted)'
                                    }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Clock size={14} /> {dateInfo.time}
                                        </span>
                                        {event.location && (
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <MapPin size={14} /> {event.location}
                                            </span>
                                        )}
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Users size={14} /> {event.rsvp_count} going
                                        </span>
                                    </div>
                                    {event.description && (
                                        <p style={{
                                            fontSize: '14px', color: 'var(--color-text-secondary)', marginTop: '8px', lineHeight: 1.6,
                                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                                        }}>
                                            {event.description}
                                        </p>
                                    )}
                                </div>

                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0,
                                    justifyContent: 'center',
                                }}>
                                    <button
                                        onClick={() => handleRsvp(event.id, 'going')}
                                        style={{
                                            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600,
                                            transition: 'all 0.2s', cursor: 'pointer', border: 'none',
                                            backgroundColor: event.rsvp_status === 'going' ? '#34D399' : 'var(--color-primary)',
                                            color: 'white', minWidth: '100px',
                                        }}
                                    >
                                        {event.rsvp_status === 'going' ? 'Going ✓' : 'RSVP'}
                                    </button>
                                    <button
                                        onClick={() => handleRsvp(event.id, 'interested')}
                                        style={{
                                            padding: '8px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 500,
                                            transition: 'all 0.2s', cursor: 'pointer', minWidth: '100px',
                                            backgroundColor: event.rsvp_status === 'interested' ? 'var(--color-primary-light)' : 'var(--color-bg-elevated)',
                                            color: event.rsvp_status === 'interested' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                            border: '1px solid var(--color-border)',
                                        }}
                                    >
                                        Interested
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Responsive helper for layout */}
            <style>{`
        .sm-flex-row { flex-direction: column; }
        @media (min-width: 640px) {
          .sm-flex-row { flex-direction: row; }
        }
      `}</style>
        </div>
    )
}
