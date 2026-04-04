import { useState } from 'react'
import { Modal } from './Modal'
import { supabase } from '../utils/supabase'
import { FiMail, FiLock } from 'react-icons/fi'
import '../auth-modal.css'

type Props = { isOpen: boolean; onClose: () => void }

export function AuthModal({ isOpen, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password })

    setLoading(false)
    if (error) setError(error.message)
    else onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="auth-modal">
        <h2 className="auth-modal-title">
          {mode === 'login' ? 'Logga in' : 'Skapa konto'}
        </h2>
        <p className="auth-modal-subtitle">
          {mode === 'login'
            ? 'Logga in för att spara din matkasse och se personliga erbjudanden.'
            : 'Skapa ett konto för att komma igång.'}
        </p>

        <form className="auth-modal-form" onSubmit={handleSubmit}>
          <div className="auth-input-group">
            <FiMail className="auth-input-icon" />
            <input
              type="email"
              className="auth-input"
              placeholder="E-post"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="auth-input-group">
            <FiLock className="auth-input-icon" />
            <input
              type="password"
              className="auth-input"
              placeholder="Lösenord"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-submit-btn" type="submit" disabled={loading}>
            {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : 'Registrera'}
          </button>
        </form>

        <div className="auth-divider">
          <span>eller</span>
        </div>

        <button
          className="auth-toggle-btn"
          onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(null) }}
        >
          {mode === 'login' ? 'Inget konto? Registrera dig' : 'Har du ett konto? Logga in'}
        </button>
      </div>
    </Modal>
  )
}
