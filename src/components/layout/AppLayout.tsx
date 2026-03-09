'use client'

import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import MobileNav from '@/components/layout/MobileNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--color-bg-primary)', maxWidth: '100vw', overflow: 'hidden' }}>
                {/* Desktop Sidebar */}
                <div className="desktop-sidebar">
                    <Sidebar />
                </div>

                {/* Main Content */}
                <div className="main-content" style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    minWidth: 0,
                    overflow: 'hidden',
                }}>
                    <TopBar />

                    <main style={{
                        flex: 1,
                        padding: '24px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        paddingBottom: '100px', /* space for mobile nav */
                    }}>
                        {children}
                    </main>
                </div>

                {/* Mobile Bottom Nav */}
                <div className="mobile-nav">
                    <MobileNav />
                </div>
            </div>

            <style>{`
        .desktop-sidebar { display: none; }
        .main-content { margin-left: 0; max-width: 100vw; }
        .mobile-nav { display: block; }
        main { padding: 16px !important; padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 24px) !important; }
        
        @media (min-width: 768px) {
          .desktop-sidebar { display: block; }
          .main-content { margin-left: 240px; max-width: calc(100vw - 240px); }
          .mobile-nav { display: none; }
          main { padding: 24px !important; padding-bottom: 24px !important; }
        }
      `}</style>
        </>
    )
}
