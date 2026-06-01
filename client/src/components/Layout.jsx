import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ShieldIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const navLinks = {
  student: [
    { to: '/', label: 'Dashboard', icon: '◉' },
    { to: '/exams', label: 'Exams', icon: '◈' },
  ],
  instructor: [
    { to: '/', label: 'Dashboard', icon: '◉' },
    { to: '/exams', label: 'Exams', icon: '◈' },
    { to: '/exams/create', label: 'Create Exam', icon: '◌' },
  ],
  admin: [
    { to: '/', label: 'Dashboard', icon: '◉' },
    { to: '/exams', label: 'Exams', icon: '◈' },
    { to: '/exams/create', label: 'Create Exam', icon: '◌' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = navLinks[user?.role] || navLinks.student;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: 240,
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        position: 'fixed',
        top: 0, left: 0, bottom: 0,
        zIndex: 100,
      }}>
        {/* Logo */}
        <div style={{ padding: '0 24px 32px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ color: 'var(--accent)' }}><ShieldIcon /></div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.02em' }}>ExamGuard</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Integrity System
            </div>
          </div>
        </div>

        {/* Role badge */}
        <div style={{ padding: '0 24px 24px' }}>
          <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>
              Signed in as
            </div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{user?.name}</div>
            <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>{user?.role}</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0 12px' }}>
          {links.map(link => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 4,
              fontSize: 14,
              fontWeight: 600,
              color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 16 }}>{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '0 12px' }}>
          <button onClick={() => { logout(); navigate('/auth'); }} className="btn btn-ghost w-full" style={{ justifyContent: 'center' }}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ marginLeft: 240, flex: 1, padding: '40px 40px', minHeight: '100vh' }}>
        <Outlet />
      </main>
    </div>
  );
}
