import Link from 'next/link'
import { Logo } from '@/components/Logo'
import {
  ArrowRight,
  Users,
  Calendar,
  Repeat2,
  Image as ImageIcon,
  Sparkles,
  MessageCircle,
  Globe,
  Zap,
  ChevronRight,
  Star,
} from 'lucide-react'

const features = [
  {
    icon: Users,
    title: 'Clubs & Communities',
    description: 'Join campus clubs, engage in discussions, and find your tribe.',
    color: '#8B5CF6',
    gradient: 'var(--color-primary)',
  },
  {
    icon: Repeat2,
    title: 'SwipeX',
    description: 'Discover and connect with students who share your interests.',
    color: '#FB923C',
    gradient: 'var(--color-primary)',
  },
  {
    icon: Calendar,
    title: 'Events & Announcements',
    description: 'Never miss a campus event. RSVP and stay in the loop.',
    color: '#38BDF8',
    gradient: 'var(--color-primary)',
  },
  {
    icon: MessageCircle,
    title: 'Social Feed & DMs',
    description: 'Share moments, react to posts, and message peers directly.',
    color: '#34D399',
    gradient: 'var(--color-primary)',
  },
  {
    icon: ImageIcon,
    title: 'UniWall',
    description: 'Your campus memory board. Share photos and achievements.',
    color: '#F87171',
    gradient: 'var(--color-primary)',
  },
  {
    icon: Sparkles,
    title: 'XPLORE AI',
    description: 'AI-powered academic help, smart suggestions, and reminders.',
    color: '#FBBF24',
    gradient: 'var(--color-primary)',
  },
]

const stats = [
  { value: '100+', label: 'Active Clubs' },
  { value: '5K+', label: 'Students' },
  { value: '200+', label: 'Events Monthly' },
  { value: '24/7', label: 'AI Support' },
]

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: 'var(--color-bg-primary)', color: 'var(--color-text-primary)', minHeight: '100vh' }}>
      {/* ========== NAVBAR ========== */}
      <nav style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '16px 24px',
        backgroundColor: 'rgba(9, 9, 11, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Logo size="sm" />
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Link
              href="/login"
              style={{
                padding: '8px 20px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: '12px',
                color: 'var(--color-text-secondary)',
                transition: 'color 0.2s',
              }}
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="hover-lift"
              style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 600,
                borderRadius: '12px',
                color: 'white',
                background: 'var(--color-primary)',
                transition: 'all 0.2s',
              }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ========== HERO SECTION ========== */}
      <section style={{
        position: 'relative',
        paddingTop: '160px',
        paddingBottom: '100px',
        paddingLeft: '24px',
        paddingRight: '24px',
        overflow: 'hidden',
      }}>
        {/* Background Glow */}
        <div style={{
          position: 'absolute',
          top: '60px',
          left: '20%',
          width: '600px',
          height: '600px',
          borderRadius: '50%',
          opacity: 0.15,
          filter: 'blur(140px)',
          background: 'var(--color-primary)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: '200px',
          right: '15%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          opacity: 0.1,
          filter: 'blur(120px)',
          background: 'var(--color-secondary)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          opacity: 0.08,
          filter: 'blur(100px)',
          background: 'var(--color-accent)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Badge */}
          <div className="animate-in" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 16px',
            borderRadius: '9999px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '32px',
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            color: 'var(--color-primary)',
          }}>
            <Zap size={14} />
            <span>The future of campus life is here</span>
          </div>

          {/* Main Heading */}
          <h1 className="animate-slide-up" style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(36px, 7vw, 72px)',
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: '-0.03em',
            marginBottom: '24px',
          }}>
            Your Campus.{' '}
            <span className="gradient-text">One Platform.</span>
            <br />
            Infinite Possibilities.
          </h1>

          {/* Subtitle */}
          <p style={{
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'var(--color-text-secondary)',
            maxWidth: '600px',
            margin: '0 auto 40px',
            lineHeight: 1.7,
          }}>
            Connect with students, join clubs, discover events, and get AI-powered
            academic help — all in one beautifully designed platform.
          </p>

          {/* CTA Buttons */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '80px',
          }}>
            <Link
              href="/signup"
              className="hover-lift"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '14px',
                color: 'white',
                background: 'var(--color-primary)',
                boxShadow: '0 4px 24px rgba(139, 92, 246, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              Start Exploring <ArrowRight size={18} />
            </Link>
            <Link
              href="#features"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 32px',
                fontSize: '16px',
                fontWeight: 500,
                borderRadius: '14px',
                color: 'var(--color-text-secondary)',
                border: '1px solid var(--color-border)',
                transition: 'all 0.2s',
              }}
            >
              See Features
            </Link>
          </div>

          {/* Stats Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '16px',
            maxWidth: '700px',
            margin: '0 auto',
          }}>
            {stats.map((stat) => (
              <div key={stat.label} style={{
                textAlign: 'center',
                padding: '20px 12px',
                borderRadius: '16px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
              }}>
                <p className="gradient-text" style={{
                  fontSize: 'clamp(20px, 3vw, 28px)',
                  fontWeight: 700,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1.2,
                }}>
                  {stat.value}
                </p>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--color-text-muted)',
                  marginTop: '4px',
                }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== FEATURES SECTION ========== */}
      <section id="features" style={{
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          {/* Section Header */}
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-primary)',
              marginBottom: '12px',
            }}>
              Features
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Everything you need.{' '}
              <span className="gradient-text">All in one place.</span>
            </h2>
            <p style={{
              fontSize: '17px',
              color: 'var(--color-text-secondary)',
              maxWidth: '550px',
              margin: '0 auto',
              lineHeight: 1.7,
            }}>
              UNI-X brings together every aspect of university life into a single, powerful platform.
            </p>
          </div>

          {/* Feature Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '20px',
          }}>
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <div
                  key={feature.title}
                  className="hover-lift"
                  style={{
                    padding: '32px',
                    borderRadius: '20px',
                    backgroundColor: 'var(--color-bg-card)',
                    border: '1px solid var(--color-border)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    background: `${feature.color}15`,
                    color: feature.color,
                  }}>
                    <Icon size={24} />
                  </div>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '18px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    letterSpacing: '-0.01em',
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    fontSize: '14px',
                    lineHeight: 1.7,
                    color: 'var(--color-text-secondary)',
                  }}>
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ========== HOW IT WORKS ========== */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p style={{
              fontSize: '13px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--color-secondary)',
              marginBottom: '12px',
            }}>
              How it works
            </p>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
            }}>
              Get started in <span className="gradient-text">3 simple steps</span>
            </h2>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '24px',
          }}>
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up with your university email in seconds.' },
              { step: '02', title: 'Set Up Profile', desc: 'Add your interests, skills, and connect with peers.' },
              { step: '03', title: 'Start Exploring', desc: 'Join clubs, swipe, attend events, and chat with AI.' },
            ].map((item) => (
              <div key={item.step} style={{
                padding: '32px',
                borderRadius: '20px',
                backgroundColor: 'var(--color-bg-card)',
                border: '1px solid var(--color-border)',
                textAlign: 'center',
              }}>
                <div className="gradient-text" style={{
                  fontSize: '48px',
                  fontWeight: 800,
                  fontFamily: 'var(--font-display)',
                  lineHeight: 1,
                  marginBottom: '16px',
                  opacity: 0.6,
                }}>
                  {item.step}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '18px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}>
                  {item.title}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--color-text-secondary)',
                  lineHeight: 1.7,
                }}>
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========== CTA SECTION ========== */}
      <section style={{ padding: '80px 24px' }}>
        <div style={{
          maxWidth: '900px',
          margin: '0 auto',
          textAlign: 'center',
          padding: '64px 40px',
          borderRadius: '28px',
          position: 'relative',
          overflow: 'hidden',
          background: 'rgba(139,92,246,0.1)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            opacity: 0.15,
            filter: 'blur(80px)',
            background: 'var(--color-primary)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            bottom: '-50px',
            left: '-50px',
            width: '250px',
            height: '250px',
            borderRadius: '50%',
            opacity: 0.1,
            filter: 'blur(60px)',
            background: 'var(--color-secondary)',
            pointerEvents: 'none',
          }} />

          <div style={{ position: 'relative', zIndex: 1 }}>
            <Globe size={48} style={{ color: 'var(--color-primary)', margin: '0 auto 24px' }} />
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(28px, 4vw, 40px)',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              marginBottom: '16px',
            }}>
              Ready to <span className="gradient-text">Xplore</span>?
            </h2>
            <p style={{
              fontSize: '17px',
              color: 'var(--color-text-secondary)',
              maxWidth: '480px',
              margin: '0 auto 32px',
              lineHeight: 1.7,
            }}>
              Join thousands of students already using UNI-X to make the most of their university experience.
            </p>
            <Link
              href="/signup"
              className="hover-lift"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 36px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '14px',
                color: 'white',
                background: 'var(--color-primary)',
                boxShadow: '0 4px 24px rgba(139, 92, 246, 0.35)',
                transition: 'all 0.2s',
              }}
            >
              Create Your Account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer style={{
        padding: '32px 24px',
        borderTop: '1px solid var(--color-border)',
      }}>
        <div style={{
          maxWidth: '1100px',
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Logo size="sm" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <Link href="#features" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Features</Link>
            <Link href="/login" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Login</Link>
            <Link href="/signup" style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>Sign Up</Link>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            © 2025 UNI-X. Built for students, by students.
          </p>
        </div>
      </footer>
    </div>
  )
}
