'use client'

export default function MainError({ error, reset }: { error: Error & { digest?: string }, reset: () => void }) {
    console.error(error)

    return (
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '48px 0', textAlign: 'center' }}>
            <div style={{
                borderRadius: '24px',
                padding: '32px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
            }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>
                    This page hit an unexpected error
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', marginBottom: '20px' }}>
                    The route failed safely instead of hanging in a loading state.
                </p>
                <button
                    onClick={reset}
                    style={{
                        padding: '12px 20px',
                        borderRadius: '12px',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'white',
                        background: 'var(--color-primary)',
                    }}
                >
                    Try again
                </button>
            </div>
        </div>
    )
}

