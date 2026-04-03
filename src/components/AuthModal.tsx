import { useState } from 'react'                                                                                      
import { Modal } from './Modal'                                                                                       
import { supabase } from '../utils/supabase'                                                                          
                                                                                                                      
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
      <h2>{mode === 'login' ? 'Logga in' : 'Skapa konto'}</h2>                                                        
      <form onSubmit={handleSubmit}>                                                                                  
        <input                                                                                                        
          type="email"                                                                                                
          placeholder="E-post"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required                                                                                                    
        />
        <input                                                                                                        
          type="password"
          placeholder="Lösenord"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
        />
        {error && <p style={{ color: 'red' }}>{error}</p>}                                                            
        <button type="submit" disabled={loading}>
          {loading ? 'Laddar...' : mode === 'login' ? 'Logga in' : 'Registrera'}                                      
        </button>                                                                                                     
      </form>
      <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>                                         
        {mode === 'login' ? 'Inget konto? Registrera dig' : 'Har du ett konto? Logga in'}                             
      </button>                                                                                                       
    </Modal>                                                                                                          
  )                                                                                                                   
}
