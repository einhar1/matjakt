import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { NavbarView } from '../views/NavbarView'
import { AuthModal } from './AuthModal'
import { useAuth } from '../context/AuthContext'
import { useProfileSync } from '../hooks/useProfileSync'
import { userModel } from '../models/userModel'
import { offerItemToCartProduct, type OfferItem } from './OfferCard'

export function Layout() {
  const [loginOpen, setLoginOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  // Wait for the user's profile to load from Supabase before rendering
  // This ensures userModel is hydrated before any child component reads it
  const { loading: profileLoading } = useProfileSync()
  if (profileLoading) return <div className="profile-loading">Laddar...</div>
                                                                                                                      
  function handleLoginClick() {
    if (user) navigate('/profile')   // already logged in -> go to profile
    else setLoginOpen(true)                                                                                           
  }
                                                                                                                      
  function handleSearch(query: string) {
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  function handleAddToCart(offer: OfferItem) {
    userModel.addToCart(offerItemToCartProduct(offer));
  }                                                                                                                   
  
  return (                                                                                                            
    <>          
      <NavbarView
        onSearch={handleSearch}
        onLoginClick={handleLoginClick}
        onCartClick={() => navigate('/checkout')}
        onAddToCart={handleAddToCart}
        user={useAuth().user}
      />                                                                                                              
      <AuthModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      <Outlet />                                                                                                      
    </>         
  )
}