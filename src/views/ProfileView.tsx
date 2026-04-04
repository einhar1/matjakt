import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiCalendar, FiLogOut, FiUser } from 'react-icons/fi';
import '../profile.css';

function ProfileView() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  if (loading) {
    return (
      <div className="profile-wrapper">
        <div className="profile-container">
          <p className="profile-loading">Laddar profil...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/');
    return null;
  }

  const createdAt = new Date(user.created_at).toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="profile-wrapper">
      <div className="profile-container">
        <h1 className="profile-title">Min profil</h1>

        {/* Account info */}
        <section className="profile-section">
          <h2 className="profile-section-title">Kontoinformation</h2>
          <div className="profile-card">
            <div className="profile-field">
                <FiUser className="profile-field-icon" />
                <div>
                    <span className="profile-field-label">Name</span>
                    <span className="profile-field-value">{user.user_metadata?.display_name || "Anonymous"}</span>
                </div>
            </div>
            <div className="profile-field">
              <FiMail className="profile-field-icon" />
              <div>
                <span className="profile-field-label">E-post</span>
                <span className="profile-field-value">{user.email}</span>
              </div>
            </div>
            <div className="profile-field">
              <FiCalendar className="profile-field-icon" />
              <div>
                <span className="profile-field-label">Medlem sedan</span>
                <span className="profile-field-value">{createdAt}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Sign out */}
        <section className="profile-section">
          <button className="profile-signout-btn" onClick={handleSignOut}>
            <FiLogOut size={16} />
            Logga ut
          </button>
        </section>
      </div>
    </div>
  );
}

export { ProfileView };
