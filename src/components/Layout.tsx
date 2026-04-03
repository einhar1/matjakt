import { useState } from 'react'                                                                                      
import { useNavigate, Outlet } from 'react-router-dom'
import { NavbarView } from '../views/NavbarView'                                                                      
import { AuthModal } from './AuthModal'
import { useAuth } from '../context/AuthContext'                                                                      
                                                                                                                      
export function Layout() {
  const [loginOpen, setLoginOpen] = useState(false)                                                                   
  const { user } = useAuth()                                                                                          
  const navigate = useNavigate()
                                                                                                                      
  function handleLoginClick() {
    if (user) navigate('/profile')   // already logged in -> go to profile
    else setLoginOpen(true)                                                                                           
  }
                                                                                                                      
  function handleSearch(query: string) {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }                                                                                                                   
  
  return (                                                                                                            
    <>          
      <NavbarView
        onSearch={handleSearch}
        onLoginClick={handleLoginClick}
        onCartClick={() => navigate('/checkout')}
      />                                                                                                              
      <AuthModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      <Outlet />                                                                                                      
    </>         
  )
}