import { useState } from 'react'
import { Modal } from './Modal'
import { supabase } from '../utils/supabase'
import { FiMail, FiLock, FiPercent } from 'react-icons/fi'
import '../auth-modal.css'
import { PiUser } from 'react-icons/pi'
import { userModel } from '../models/userModel'

type Props = { isOpen: boolean; onClose: () => void }

export function AuthModal({ isOpen, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('');
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [hasSeniorDiscount, setHasSeniorDiscount] = useState(false)
  const [seniorDiscountPercent, setSeniorDiscountPercent] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (mode === 'signup') {
      // Stage discount on the local model so useProfileSync persists it on first sign-in
      const percent = parseFloat(seniorDiscountPercent);
      userModel.hasSeniorDiscount = hasSeniorDiscount;
      userModel.seniorDiscountPercent = hasSeniorDiscount && !isNaN(percent)
        ? Math.max(0, Math.min(100, percent))
        : 0;
    }

    const { error } =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password, options: { data: {display_name: name}} })

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
          {mode === 'signup' && (
            <div className="auth-input-group">
              <PiUser className="auth-input-icon" />
              <input 
                type="text"
                className="auth-input"
                placeholder="Name"
                value={name}
                onChange={e => setName(e.target.value)}
                required={mode === 'signup'}
              />
            </div>
          )}
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

          {mode === 'signup' && (
            <div className="auth-discount-block">
              <label className="auth-discount-toggle">
                <input
                  type="checkbox"
                  checked={hasSeniorDiscount}
                  onChange={e => setHasSeniorDiscount(e.target.checked)}
                />
                <span>Jag har pensionärsrabatt</span>
              </label>
              {hasSeniorDiscount && (
                <div className="auth-input-group">
                  <FiPercent className="auth-input-icon" />
                  <input
                    type="number"
                    className="auth-input"
                    placeholder="Rabatt i procent (t.ex. 10)"
                    min={0}
                    max={100}
                    step={1}
                    value={seniorDiscountPercent}
                    onChange={e => setSeniorDiscountPercent(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="btn-primary auth-submit-btn" type="submit" disabled={loading}>
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
