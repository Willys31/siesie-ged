import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav style={{
      background: '#1e40af',
      padding: '0 2rem',
      height: '56px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    }}>
      <Link to="/" style={{ color: 'white', fontWeight: 700, fontSize: '1.1rem', textDecoration: 'none' }}>
        SieSie
      </Link>
      {user && (
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#bfdbfe', textDecoration: 'none', fontSize: '0.9rem' }}>
            Tableau de bord
          </Link>
          <Link to="/documents" style={{ color: '#bfdbfe', textDecoration: 'none', fontSize: '0.9rem' }}>
            Documents
          </Link>
          <span style={{ color: '#93c5fd', fontSize: '0.9rem' }}>
            {user.full_name || user.username}
          </span>
          <button onClick={handleLogout} className="btn btn-secondary" style={{ padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
            Déconnexion
          </button>
        </div>
      )}
    </nav>
  )
}
