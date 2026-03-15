import { Logo } from "@/components/Logo"

export default function MainLoading() {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            width: '100%',
        }}>
            <Logo variant="mark" size="lg" className="animate-pulse" />
        </div>
    )
}
