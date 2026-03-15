'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { AtSign, User, GraduationCap, BookOpen, Calendar, Sparkles, Loader2, Check, X, ArrowRight, Camera } from 'lucide-react'
import { uploadImage } from '@/lib/upload'

export default function SetupProfilePage() {
    const router = useRouter()
    const { user, profile, refreshProfile } = useAuth()
    const [step, setStep] = useState(1)
    const [username, setUsername] = useState('')
    const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken' | 'invalid'>('idle')
    const [usernameError, setUsernameError] = useState('')
    const [bio, setBio] = useState('')
    const [department, setDepartment] = useState('')
    const [year, setYear] = useState('')
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<NodeJS.Timeout | null>(null)

    // Redirect if already completed
    useEffect(() => {
        if (profile?.profile_completed) {
            router.push('/feed')
        }
    }, [profile, router])

    // Debounced username check
    const checkUsername = (value: string) => {
        const cleaned = value.toLowerCase().replace(/[^a-z0-9_]/g, '')
        setUsername(cleaned)

        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (cleaned.length < 3) {
            setUsernameStatus(cleaned.length > 0 ? 'invalid' : 'idle')
            setUsernameError(cleaned.length > 0 ? 'Min 3 characters' : '')
            return
        }
        if (cleaned.length > 20) {
            setUsernameStatus('invalid')
            setUsernameError('Max 20 characters')
            return
        }

        setUsernameStatus('checking')
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/check-username?username=${cleaned}`)
                const data = await res.json()
                if (data.available) {
                    setUsernameStatus('available')
                    setUsernameError('')
                } else {
                    setUsernameStatus('taken')
                    setUsernameError(data.error || 'Username is already taken')
                }
            } catch {
                setUsernameStatus('idle')
            }
        }, 400)
    }

    const compressImage = (file: File, maxSize = 512, quality = 0.7): Promise<File> => {
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                let { width, height } = img
                if (width > maxSize || height > maxSize) {
                    if (width > height) { height = (height / width) * maxSize; width = maxSize }
                    else { width = (width / height) * maxSize; height = maxSize }
                }
                canvas.width = width
                canvas.height = height
                canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
                canvas.toBlob(
                    (blob) => resolve(new File([blob!], file.name, { type: 'image/jpeg' })),
                    'image/jpeg',
                    quality
                )
            }
            img.src = URL.createObjectURL(file)
        })
    }

    const handleComplete = async () => {
        if (!user || !username) return
        setSaving(true)

        try {
            let avatarUrl = ''
            if (avatarFile) {
                try {
                    const compressed = await compressImage(avatarFile)
                    avatarUrl = (await uploadImage(compressed, 'uploads')) || ''
                } catch (e) {
                    console.error('Avatar upload failed:', e)
                    // Continue without avatar
                }
            }

            const res = await fetch('/api/setup-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    bio,
                    department,
                    year,
                    avatar_url: avatarUrl || undefined,
                }),
            })

            const data = await res.json()

            if (res.ok && data.success) {
                await refreshProfile()
                router.push('/feed')
            } else {
                console.error('Profile update error:', data.error)
                setSaving(false)
                alert(data.error || 'Something went wrong. Please try again.')
            }
        } catch (e) {
            console.error('Setup profile error:', e)
            setSaving(false)
            alert('Something went wrong. Please try again.')
        }
    }

    if (!user) return null

    const inputStyle = {
        width: '100%', padding: '14px 16px 14px 44px', borderRadius: '14px', fontSize: '15px',
        backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)',
        color: 'var(--color-text-primary)', outline: 'none', transition: 'border-color 0.2s',
    }

    const iconStyle = {
        position: 'absolute' as const, left: '14px', top: '50%', transform: 'translateY(-50%)',
        color: 'var(--color-text-muted)',
    }

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', padding: '24px',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background blobs */}
            <div style={{
                position: 'absolute', top: '15%', left: '20%', width: '400px', height: '400px',
                borderRadius: '50%', opacity: 0.08, filter: 'blur(120px)',
                background: 'var(--color-primary)', pointerEvents: 'none',
            }} />
            <div style={{
                position: 'absolute', bottom: '15%', right: '20%', width: '350px', height: '350px',
                borderRadius: '50%', opacity: 0.06, filter: 'blur(100px)',
                background: 'var(--color-secondary)', pointerEvents: 'none',
            }} />

            <div className="animate-scale-in" style={{
                width: '100%', maxWidth: '480px', position: 'relative', zIndex: 1,
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '36px' }}>
                    <div style={{
                        width: '64px', height: '64px', borderRadius: '18px', margin: '0 auto 20px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'var(--color-primary)',
                        color: 'white', boxShadow: '0 8px 30px rgba(139, 92, 246, 0.3)',
                    }}>
                        <Sparkles size={28} />
                    </div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 700,
                        letterSpacing: '-0.02em', margin: '0 0 8px 0',
                    }}>
                        {step === 1 ? 'Choose your username' : 'Complete your profile'}
                    </h1>
                    <p style={{ fontSize: '15px', color: 'var(--color-text-muted)', margin: 0 }}>
                        {step === 1 ? 'This is how others will find you on UNI-X' : 'Tell campus about yourself'}
                    </p>
                </div>

                {/* Step indicator */}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '32px' }}>
                    {[1, 2].map(s => (
                        <div key={s} style={{
                            width: s === step ? '32px' : '10px', height: '10px', borderRadius: '99px',
                            background: s <= step ? 'var(--color-primary)' : 'var(--color-bg-elevated)',
                            transition: 'all 0.3s ease',
                        }} />
                    ))}
                </div>

                {/* Card */}
                <div style={{
                    borderRadius: '24px', padding: '32px', backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
                }}>
                    {step === 1 ? (
                        /* STEP 1: Username */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
                                    Username
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <AtSign size={16} style={iconStyle} />
                                    <input
                                        type="text"
                                        value={username}
                                        onChange={e => checkUsername(e.target.value)}
                                        placeholder="your_username"
                                        maxLength={20}
                                        style={{
                                            ...inputStyle,
                                            borderColor: usernameStatus === 'available' ? 'var(--color-success)' :
                                                usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'var(--color-error)' :
                                                    'var(--color-border)',
                                        }}
                                        onFocus={e => {
                                            if (usernameStatus === 'idle') e.target.style.borderColor = 'var(--color-primary)'
                                        }}
                                        onBlur={e => {
                                            if (usernameStatus === 'idle') e.target.style.borderColor = 'var(--color-border)'
                                        }}
                                    />
                                    {/* Status icon */}
                                    <div style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)' }}>
                                        {usernameStatus === 'checking' && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-text-muted)' }} />}
                                        {usernameStatus === 'available' && <Check size={16} style={{ color: 'var(--color-success)' }} />}
                                        {(usernameStatus === 'taken' || usernameStatus === 'invalid') && <X size={16} style={{ color: 'var(--color-error)' }} />}
                                    </div>
                                </div>
                                {usernameError && (
                                    <p style={{ fontSize: '12px', color: 'var(--color-error)', margin: '6px 0 0 0' }}>
                                        {usernameError}
                                    </p>
                                )}
                                {usernameStatus === 'available' && (
                                    <p style={{ fontSize: '12px', color: 'var(--color-success)', margin: '6px 0 0 0' }}>
                                        ✓ @{username} is available!
                                    </p>
                                )}
                            </div>

                            <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)' }}>
                                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                                    💡 <strong style={{ color: 'var(--color-text-secondary)' }}>Tips:</strong> Use lowercase letters, numbers, and underscores. This will be your unique @handle across UNI-X.
                                </p>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={usernameStatus !== 'available'}
                                className="hover-lift"
                                style={{
                                    width: '100%', padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 600,
                                    color: 'white', border: 'none', cursor: usernameStatus !== 'available' ? 'not-allowed' : 'pointer',
                                    background: 'var(--color-primary)',
                                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                                    opacity: usernameStatus !== 'available' ? 0.5 : 1,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Continue <ArrowRight size={16} />
                            </button>
                        </div>
                    ) : (
                        /* STEP 2: Profile Details */
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Avatar */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        width: '100px', height: '100px', borderRadius: '50%', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        background: avatarPreview ? `url(${avatarPreview}) center/cover` :
                                            'var(--color-primary)',
                                        color: 'white', fontSize: '36px', fontWeight: 800, position: 'relative',
                                        border: '4px solid var(--color-bg-elevated)',
                                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                                    }}
                                >
                                    {!avatarPreview && (profile?.full_name?.[0] || 'U')}
                                    <div style={{
                                        position: 'absolute', bottom: '0', right: '0', width: '32px', height: '32px',
                                        borderRadius: '50%', backgroundColor: 'var(--color-primary)', display: 'flex',
                                        alignItems: 'center', justifyContent: 'center', border: '3px solid var(--color-bg-card)',
                                    }}>
                                        <Camera size={14} />
                                    </div>
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={e => {
                                        const file = e.target.files?.[0]
                                        if (file) {
                                            setAvatarFile(file)
                                            setAvatarPreview(URL.createObjectURL(file))
                                        }
                                    }}
                                    accept="image/png, image/jpeg, image/webp"
                                    style={{ display: 'none' }}
                                />
                            </div>

                            <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)', margin: '-12px 0 0 0' }}>
                                Tap to upload a photo
                            </p>

                            {/* Bio */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Bio</label>
                                <div style={{ position: 'relative' }}>
                                    <User size={16} style={{ ...iconStyle, top: '20px', transform: 'none' }} />
                                    <textarea
                                        value={bio}
                                        onChange={e => setBio(e.target.value)}
                                        placeholder="Tell people about yourself..."
                                        rows={3}
                                        maxLength={200}
                                        style={{
                                            ...inputStyle, resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.5,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Department</label>
                                <div style={{ position: 'relative' }}>
                                    <BookOpen size={16} style={iconStyle} />
                                    <input type="text" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. Computer Science" style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                                </div>
                            </div>

                            {/* Year */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>Year</label>
                                <div style={{ position: 'relative' }}>
                                    <Calendar size={16} style={iconStyle} />
                                    <input type="text" value={year} onChange={e => setYear(e.target.value)} placeholder="e.g. 2nd Year, 2025" style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'var(--color-primary)'} onBlur={e => e.target.style.borderColor = 'var(--color-border)'} />
                                </div>
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setStep(1)}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '14px', fontSize: '14px', fontWeight: 600,
                                        backgroundColor: 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)',
                                        border: '1px solid var(--color-border)', cursor: 'pointer',
                                    }}
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleComplete}
                                    disabled={saving}
                                    className="hover-lift"
                                    style={{
                                        flex: 2, padding: '14px', borderRadius: '14px', fontSize: '15px', fontWeight: 600,
                                        color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                                        background: 'var(--color-primary)',
                                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                                        opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        transition: 'all 0.2s',
                                    }}
                                >
                                    {saving ? <Loader2 size={18} className="animate-spin" /> : <><Sparkles size={16} /> Start Exploring</>}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Username preview */}
                {step === 1 && username && usernameStatus === 'available' && (
                    <div style={{
                        textAlign: 'center', marginTop: '20px', padding: '16px', borderRadius: '16px',
                        backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)',
                    }}>
                        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '0 0 4px 0' }}>
                            Your profile will appear as
                        </p>
                        <p style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-display)', margin: 0 }}>
                            <span className="gradient-text">@{username}</span>
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
