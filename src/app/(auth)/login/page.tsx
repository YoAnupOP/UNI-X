'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, Sparkles } from 'lucide-react'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const supabase = createClient()

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)

        const { error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            setError(error.message)
            setLoading(false)
        } else {
            router.push('/feed')
        }
    }

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
        }}>
            {/* Left Panel - Branding (desktop only) */}
            <div style={{
                display: 'none',
                flex: 1,
                position: 'relative',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(56,189,248,0.08))',
                borderRight: '1px solid var(--color-border)',
                padding: '60px',
                flexDirection: 'column',
                justifyContent: 'center',
            }} className="lg-flex">
                {/* Glow effects */}
                <div style={{
                    position: 'absolute', top: '20%', left: '30%', width: '400px', height: '400px',
                    borderRadius: '50%', opacity: 0.2, filter: 'blur(120px)', background: 'var(--color-primary)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '20%', right: '20%', width: '300px', height: '300px',
                    borderRadius: '50%', opacity: 0.15, filter: 'blur(100px)', background: 'var(--color-secondary)', pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px',
                    }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            color: 'white', fontWeight: 700, fontSize: '20px', fontFamily: 'var(--font-display)',
                        }}>X</div>
                        <span style={{ fontSize: '28px', fontWeight: 700, fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}>UNI-X</span>
                    </div>

                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
                        lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '16px',
                    }}>
                        Your campus life,<br />
                        <span className="gradient-text">reimagined.</span>
                    </h2>
                    <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: '380px' }}>
                        Connect with peers, discover events, join clubs, and get AI-powered academic help — all in one platform.
                    </p>

                    {/* Floating feature pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '40px' }}>
                        {['Clubs', 'Events', 'SwipeX', 'AI Chat', 'UniWall', 'DMs'].map(tag => (
                            <span key={tag} style={{
                                padding: '6px 14px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500,
                                backgroundColor: 'rgba(139, 92, 246, 0.1)', border: '1px solid rgba(139, 92, 246, 0.15)',
                                color: 'var(--color-text-secondary)',
                            }}>{tag}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                position: 'relative',
                overflow: 'hidden',
            }}>
                {/* Background glow */}
                <div style={{
                    position: 'absolute', top: '30%', right: '20%', width: '300px', height: '300px',
                    borderRadius: '50%', opacity: 0.08, filter: 'blur(100px)', background: 'var(--color-primary)', pointerEvents: 'none',
                }} />

                <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
                    {/* Mobile Logo */}
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <div style={{
                            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                            color: 'white', fontWeight: 700, fontSize: '24px', fontFamily: 'var(--font-display)',
                            boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
                        }}>X</div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
                            letterSpacing: '-0.02em', marginBottom: '6px',
                        }}>Welcome back</h1>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Sign in to continue exploring</p>
                    </div>

                    {/* Error */}
                    {error && (
                        <div style={{
                            padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px',
                            backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)',
                            color: '#F87171',
                        }}>{error}</div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@gmail.com"
                                    required
                                    style={{
                                        width: '100%', padding: '12px 14px 12px 40px', borderRadius: '12px', fontSize: '14px',
                                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)', transition: 'border-color 0.2s',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your password"
                                    required
                                    style={{
                                        width: '100%', padding: '12px 44px 12px 40px', borderRadius: '12px', fontSize: '14px',
                                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                                        color: 'var(--color-text-primary)', transition: 'border-color 0.2s',
                                        outline: 'none',
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'}
                                    onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="hover-lift"
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                                color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '4px',
                            }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Sign In <ArrowRight size={16} /></>}
                        </button>
                    </form>

                    {/* Footer */}
                    <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '28px' }}>
                        Don&apos;t have an account?{' '}
                        <Link href="/signup" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Create one</Link>
                    </p>
                </div>
            </div>

            {/* CSS for responsive left panel */}
            <style>{`
        @media (min-width: 1024px) {
          .lg-flex { display: flex !important; }
        }
      `}</style>
        </div>
    )
}
