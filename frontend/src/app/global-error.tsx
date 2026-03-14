'use client'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafb',
                    padding: '24px'
                }}>
                    <div style={{ textAlign: 'center', maxWidth: '400px' }}>
                        <h2 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', marginBottom: '12px' }}>
                            Application Error
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>
                            A critical error occurred. Please refresh the page.
                        </p>
                        <button
                            onClick={() => reset()}
                            style={{
                                padding: '12px 24px',
                                backgroundColor: '#0891b2',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontWeight: 500
                            }}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            </body>
        </html>
    )
}
