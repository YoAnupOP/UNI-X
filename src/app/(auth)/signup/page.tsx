'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Logo } from '@/components/Logo'
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Lock, User, GraduationCap, CheckCircle2, Sparkles } from 'lucide-react'

export default function SignupPage() {
    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [university, setUniversity] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const supabase = createClient()

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password.length < 6) {
            setError('Password must be at least 6 characters')
            return
        }

        setLoading(true)

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                    university: university,
                },
            },
        })

        if (error) {
            setError(error.message)
        } else {
            setSuccess(true)
        }
        setLoading(false)
    }

    if (success) {
        return (
            <div style={{
                minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', padding: '24px',
            }}>
                <div className="animate-scale-in" style={{ textAlign: 'center', maxWidth: '420px' }}>
                    <div style={{
                        width: '72px', height: '72px', borderRadius: '20px', margin: '0 auto 24px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(52, 211, 153, 0.12)', color: '#34D399',
                    }}>
                        <CheckCircle2 size={36} />
                    </div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700, marginBottom: '12px' }}>
                        Check your email! 🎉
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.7, marginBottom: '32px' }}>
                        We&apos;ve sent a confirmation link to <strong style={{ color: 'var(--color-text-primary)' }}>{email}</strong>. Click the link to verify your account and start exploring UNI-X.
                    </p>
                    <Link
                        href="/login"
                        className="hover-lift"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '8px',
                            padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                            color: 'white', background: 'var(--color-primary)',
                            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)', transition: 'all 0.2s',
                        }}
                    >
                        Go to Login <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        )
    }

    const inputStyle = {
        width: '100%', padding: '12px 14px 12px 40px', borderRadius: '12px', fontSize: '14px',
        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)', transition: 'border-color 0.2s', outline: 'none',
    }

    const iconStyle = {
        position: 'absolute' as const, left: '14px', top: '50%', transform: 'translateY(-50%)',
        color: 'var(--color-text-muted)',
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex',
            backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)',
        }}>
            {/* Left Panel - Branding (desktop only) */}
            <div style={{
                display: 'none', flex: 1, position: 'relative', overflow: 'hidden',
                background: 'rgba(139,92,246,0.1)',
                borderRight: '1px solid var(--color-border)', padding: '60px',
                flexDirection: 'column', justifyContent: 'center',
            }} className="lg-flex">
                <div style={{
                    position: 'absolute', top: '20%', left: '30%', width: '400px', height: '400px',
                    borderRadius: '50%', opacity: 0.2, filter: 'blur(120px)', background: 'var(--color-primary)', pointerEvents: 'none',
                }} />
                <div style={{
                    position: 'absolute', bottom: '20%', right: '20%', width: '300px', height: '300px',
                    borderRadius: '50%', opacity: 0.15, filter: 'blur(100px)', background: 'var(--color-secondary)', pointerEvents: 'none',
                }} />

                <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '48px' }}>
                        <Logo size="lg" />
                    </div>

                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: '36px', fontWeight: 700,
                        lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: '16px',
                    }}>
                        Join the campus<br />
                        <span className="gradient-text">revolution.</span>
                    </h2>
                    <p style={{ fontSize: '16px', color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: '380px' }}>
                        Be part of a community that connects, inspires, and empowers university students everywhere.
                    </p>

                    {/* Benefits */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '40px' }}>
                        {[
                            'Discover clubs that match your interests',
                            'Get AI-powered study assistance 24/7',
                            'Connect with students across campus',
                            'Never miss an event or announcement',
                        ].map(text => (
                            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                                <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                                {text}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Panel - Signup Form */}
            <div style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '40px 24px', position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', top: '30%', right: '20%', width: '300px', height: '300px',
                    borderRadius: '50%', opacity: 0.08, filter: 'blur(100px)', background: 'var(--color-primary)', pointerEvents: 'none',
                }} />

                <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
                    {/* Mobile Logo */}
                    <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 32 }}>
                            <Logo size="lg" />
                            <p style={{ marginTop: 8, color: "var(--color-text-muted)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                                University Xplore
                            </p>
                        </div>
                        <h1 style={{
                            fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
                            letterSpacing: '-0.02em', marginBottom: '6px',
                        }}>Create your account</h1>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>Join the campus community</p>
                    </div>

                    {error && (
                        <div style={{
                            padding: '12px 16px', borderRadius: '12px', fontSize: '13px', marginBottom: '20px',
                            backgroundColor: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)',
                            color: '#F87171',
                        }}>{error}</div>
                    )}

                    <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Full Name</label>
                            <div style={{ position: 'relative' }}>
                                <User size={16} style={iconStyle} />
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="John Doe" required style={inputStyle}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={iconStyle} />
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" required style={inputStyle}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>University</label>
                            <div style={{ position: 'relative' }}>
                                <GraduationCap size={16} style={iconStyle} />
                                <input type="text" value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Your university name" required style={inputStyle}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'} />
                            </div>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <Lock size={16} style={iconStyle} />
                                <input
                                    type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimum 6 characters" required
                                    style={{ ...inputStyle, paddingRight: '44px' }}
                                    onFocus={(e) => e.target.style.borderColor = 'var(--color-primary)'} onBlur={(e) => e.target.style.borderColor = 'var(--color-border)'}
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                    color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer',
                                }}>
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit" disabled={loading}
                            className="hover-lift"
                            style={{
                                width: '100%', padding: '14px', borderRadius: '12px', fontSize: '15px', fontWeight: 600,
                                color: 'white', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                                background: 'var(--color-primary)',
                                boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                opacity: loading ? 0.7 : 1, transition: 'all 0.2s', marginTop: '4px',
                            }}
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : <>Create Account <ArrowRight size={16} /></>}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', fontSize: '14px', color: 'var(--color-text-muted)', marginTop: '28px' }}>
                        Already have an account?{' '}
                        <Link href="/login" style={{ color: 'var(--color-primary)', fontWeight: 600 }}>Sign in</Link>
                    </p>
                </div>
            </div>

            <style>{`
        @media (min-width: 1024px) {
          .lg-flex { display: flex !important; }
        }
      `}</style>
        </div>
    )
}
