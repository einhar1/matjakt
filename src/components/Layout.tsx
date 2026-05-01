import { useState } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import { NavbarView } from '../views/NavbarView'
import { AuthModal } from './AuthModal'
import { useAuth } from '../context/AuthContext'
import { useProfileSync } from '../hooks/useProfileSync'
import { type userModelType } from '../models/userModel'
import { offerItemToCartProduct, type OfferItem } from './OfferCard'
import { useToast } from '../context/ToastContext'

type LayoutProps = {
  userModel: userModelType;
}

export function Layout(props: LayoutProps) {
  const [loginOpen, setLoginOpen] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { showCartToast } = useToast()
  const userModel = props.userModel

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
    showCartToast();
  }                                                                                                                  
  
  return (                                                                                                            
    <>          
      <NavbarView
        onSearch={handleSearch}
        onLoginClick={handleLoginClick}
        onCartClick={() => navigate('/checkout')}
        onAddToCart={handleAddToCart}
        user={useAuth().user}
        cartItemCount={userModel.cartItemCount}
      />                                                                                                              
      <AuthModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      <Outlet />                                                                                                      
    </>         
  )
}