'use client'

import { useState, useEffect, useRef, ReactNode, CSSProperties } from 'react'
import { Search, ChevronLeft, ChevronRight, X, AlertTriangle, Loader2, Inbox } from 'lucide-react'

/* ============================================
   SEARCH BAR with debounce
   ============================================ */
export function AdminSearchBar({
    value,
    onChange,
    placeholder = 'Search...',
    debounceMs = 300,
}: {
    value: string
    onChange: (val: string) => void
    placeholder?: string
    debounceMs?: number
}) {
    const [local, setLocal] = useState(value)
    const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

    useEffect(() => { setLocal(value) }, [value])

    const handleChange = (val: string) => {
        setLocal(val)
        clearTimeout(timer.current)
        timer.current = setTimeout(() => onChange(val), debounceMs)
    }

    return (
        <div style={{ position: 'relative', maxWidth: '320px', width: '100%' }}>
            <Search size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
                type="text"
                value={local}
                onChange={e => handleChange(e.target.value)}
                placeholder={placeholder}
                className="w-full py-2.5 rounded-xl text-sm"
                style={{
                    paddingLeft: '38px',
                    paddingRight: '32px',
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: 'var(--color-text-primary)',
                    outline: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.4)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(139,92,246,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none' }}
            />
            {local && (
                <button
                    onClick={() => { setLocal(''); onChange('') }}
                    style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', padding: '2px' }}
                >
                    <X size={12} />
                </button>
            )}
        </div>
    )
}

/* ============================================
   CONFIRM MODAL
   ============================================ */
export function ConfirmModal({
    open,
    title = 'Are you sure?',
    message,
    confirmLabel = 'Confirm',
    confirmColor = 'var(--color-error)',
    onConfirm,
    onCancel,
    loading = false,
}: {
    open: boolean
    title?: string
    message: string
    confirmLabel?: string
    confirmColor?: string
    onConfirm: () => void
    onCancel: () => void
    loading?: boolean
}) {
    if (!open) return null

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        }} onClick={onCancel}>
            <div
                onClick={e => e.stopPropagation()}
                className="animate-scale-in"
                style={{
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '20px',
                    padding: '28px',
                    maxWidth: '420px',
                    width: '90%',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.4)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(239,68,68,0.1)' }}>
                        <AlertTriangle size={20} style={{ color: 'var(--color-error)' }} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-display)' }}>{title}</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>{message}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-medium"
                        style={{ color: 'var(--color-text-secondary)', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'all 0.2s ease' }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                        style={{ backgroundColor: confirmColor, color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}
                    >
                        {loading && <Loader2 size={14} className="animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

/* ============================================
   STATUS BADGE (roles, priorities, etc.)
   ============================================ */
const badgeColors: Record<string, { bg: string; color: string; border: string }> = {
    admin: { bg: 'rgba(139,92,246,0.12)', color: '#A78BFA', border: 'rgba(139,92,246,0.2)' },
    moderator: { bg: 'rgba(56,189,248,0.12)', color: '#7DD3FC', border: 'rgba(56,189,248,0.2)' },
    student: { bg: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: 'rgba(148,163,184,0.15)' },
    urgent: { bg: 'rgba(239,68,68,0.12)', color: '#FCA5A5', border: 'rgba(239,68,68,0.2)' },
    high: { bg: 'rgba(251,146,60,0.12)', color: '#FDBA74', border: 'rgba(251,146,60,0.2)' },
    normal: { bg: 'rgba(56,189,248,0.12)', color: '#7DD3FC', border: 'rgba(56,189,248,0.2)' },
    low: { bg: 'rgba(148,163,184,0.08)', color: '#94A3B8', border: 'rgba(148,163,184,0.15)' },
    active: { bg: 'rgba(52,211,153,0.12)', color: '#6EE7B7', border: 'rgba(52,211,153,0.2)' },
    inactive: { bg: 'rgba(239,68,68,0.08)', color: '#FCA5A5', border: 'rgba(239,68,68,0.15)' },
}

export function StatusBadge({ value }: { value: string }) {
    const colors = badgeColors[value] || badgeColors.student
    return (
        <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: '8px',
            fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
            backgroundColor: colors.bg, color: colors.color, border: `1px solid ${colors.border}`,
        }}>
            {value}
        </span>
    )
}

/* ============================================
   PAGINATION
   ============================================ */
export function AdminPagination({
    page,
    total,
    limit,
    onPageChange,
}: {
    page: number
    total: number
    limit: number
    onPageChange: (p: number) => void
}) {
    const totalPages = Math.ceil(total / limit)
    if (totalPages <= 1) return null

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--color-border)' }}>
            <button
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="p-2.5 rounded-xl"
                style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: page <= 1 ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer',
                    opacity: page <= 1 ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                }}
            >
                <ChevronLeft size={14} />
            </button>
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                Page {page} of {totalPages} <span style={{ color: 'var(--color-text-muted)' }}>({total} total)</span>
            </span>
            <button
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="p-2.5 rounded-xl"
                style={{
                    backgroundColor: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border)',
                    color: page >= totalPages ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                    cursor: page >= totalPages ? 'not-allowed' : 'pointer',
                    opacity: page >= totalPages ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                }}
            >
                <ChevronRight size={14} />
            </button>
        </div>
    )
}

/* ============================================
   TOAST NOTIFICATION
   ============================================ */
export function AdminToast({
    message,
    type = 'success',
    onClose,
}: {
    message: string
    type?: 'success' | 'error'
    onClose: () => void
}) {
    useEffect(() => {
        const t = setTimeout(onClose, 3000)
        return () => clearTimeout(t)
    }, [onClose])

    return (
        <div style={{
            position: 'fixed', bottom: '24px', right: '24px', zIndex: 10000,
            padding: '14px 22px', borderRadius: '14px',
            fontSize: '13px', fontWeight: 600,
            backgroundColor: type === 'success' ? 'rgba(52,211,153,0.95)' : 'rgba(239,68,68,0.95)',
            color: 'white', display: 'flex', alignItems: 'center', gap: '10px',
            boxShadow: type === 'success' ? '0 8px 32px rgba(52,211,153,0.25)' : '0 8px 32px rgba(239,68,68,0.25)',
            backdropFilter: 'blur(12px)',
        }} className="animate-scale-in">
            {message}
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '2px', transition: 'color 0.2s' }}>
                <X size={14} />
            </button>
        </div>
    )
}

/* ============================================
   EMPTY STATE
   ============================================ */
export function EmptyState({ message = 'Nothing found' }: { message?: string }) {
    return (
        <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '60px 24px', color: 'var(--color-text-muted)', gap: '16px',
        }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                <Inbox size={24} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 500 }}>{message}</p>
        </div>
    )
}

/* ============================================
   ADMIN CARD wrapper
   ============================================ */
export function AdminCard({ children, className = '', style, glow }: { children: ReactNode; className?: string; style?: CSSProperties; glow?: string }) {
    return (
        <div className={`admin-card rounded-2xl ${className}`} style={{
            backgroundColor: 'var(--color-bg-card)',
            border: '1px solid var(--color-border)',
            transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
            boxShadow: glow ? `0 0 20px ${glow}` : undefined,
            ...style,
        }}>
            {children}
        </div>
    )
}

/* ============================================
   SELECT DROPDOWN
   ============================================ */
export function AdminSelect({
    value,
    onChange,
    options,
    placeholder,
}: {
    value: string
    onChange: (val: string) => void
    options: { value: string; label: string }[]
    placeholder?: string
}) {
    return (
        <select
            value={value}
            onChange={e => onChange(e.target.value)}
            className="px-3 py-2.5 rounded-xl text-sm"
            style={{
                backgroundColor: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-primary)',
                outline: 'none',
                cursor: 'pointer',
                transition: 'border-color 0.2s ease',
            }}
        >
            {placeholder && <option value="">{placeholder}</option>}
            {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
    )
}
