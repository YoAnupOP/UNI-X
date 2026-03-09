'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { LogOut, User, Shield, Bell, Palette } from 'lucide-react'

export default function SettingsPage() {
    const { profile, signOut } = useAuth()

    return (
        <div style={{ maxWidth: '672px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h1 className="gradient-text" style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, margin: 0 }}>
                Settings
            </h1>

            {/* Account */}
            <div style={{
                borderRadius: '24px', overflow: 'hidden',
                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', margin: 0 }}>
                        <User size={16} /> Account
                    </h2>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 4px 0' }}>Email</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>{profile?.email || 'Loading...'}</p>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--color-border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 4px 0' }}>Role</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, textTransform: 'capitalize' }}>{profile?.role || 'student'}</p>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-muted)' }}>
                            <Shield size={16} />
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--color-border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 4px 0' }}>Profile Visibility</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>{profile?.is_public ? 'Public' : 'Private'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Preferences */}
            <div style={{
                borderRadius: '24px', overflow: 'hidden',
                backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
            }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-border)' }}>
                    <h2 style={{ fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text-muted)', margin: 0 }}>
                        <Palette size={16} /> Preferences
                    </h2>
                </div>
                <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 4px 0' }}>Theme</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>Dark mode</p>
                        </div>
                    </div>
                    <div style={{ width: '100%', height: '1px', backgroundColor: 'var(--color-border)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                            <p style={{ fontSize: '15px', fontWeight: 500, margin: '0 0 4px 0' }}>Notifications</p>
                            <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>Enabled</p>
                        </div>
                        <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                            <Bell size={16} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Sign Out */}
            <button
                onClick={signOut}
                className="hover-lift"
                style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '16px', borderRadius: '24px', fontSize: '15px', fontWeight: 600,
                    backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)',
                    color: 'var(--color-error)', cursor: 'pointer', transition: 'all 0.2s', marginTop: '16px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(248, 113, 113, 0.1)'}
            >
                <LogOut size={18} /> Sign Out
            </button>

            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', margin: '16px 0 0 0' }}>
                UNI-X v1.0 • Built for students, by students
            </p>
        </div>
    )
}
