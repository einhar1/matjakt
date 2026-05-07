import { observer } from 'mobx-react-lite';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiCalendar, FiLogOut, FiUser, FiPercent } from 'react-icons/fi';
import { userModel } from '../models/userModel';
import '../profile.css';

const ProfileView = observer(function ProfileView() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await supabase.auth.signOut();
    navigate('/');
  }

  function onToggleDiscountACB(e: React.ChangeEvent<HTMLInputElement>) {
    userModel.setHasSeniorDiscount(e.target.checked);
  }

  function onPercentChangeACB(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseFloat(e.target.value);
    userModel.setSeniorDiscountPercent(isNaN(value) ? 0 : value);
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

        {/* Senior / pensioner discount */}
        <section className="profile-section">
          <h2 className="profile-section-title">Pensionärsrabatt</h2>
          <div className="profile-card">
            <div className="profile-field">
              <FiPercent className="profile-field-icon" />
              <div className="profile-discount-row">
                <span className="profile-field-label">Jag har pensionärsrabatt</span>
                <label className="profile-toggle">
                  <input
                    type="checkbox"
                    checked={userModel.hasSeniorDiscount}
                    onChange={onToggleDiscountACB}
                  />
                  <span className="profile-toggle-slider" />
                </label>
              </div>
            </div>
            {userModel.hasSeniorDiscount && (
              <div className="profile-field">
                <FiPercent className="profile-field-icon" />
                <div>
                  <span className="profile-field-label">Rabatt (%)</span>
                  <input
                    className="profile-percent-input"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={userModel.seniorDiscountPercent || ''}
                    onChange={onPercentChangeACB}
                    placeholder="t.ex. 10"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Sign out */}
        <section className="profile-section">
          <button className="btn-destructive profile-signout-btn" onClick={handleSignOut}>
            <FiLogOut size={16} />
            Logga ut
          </button>
        </section>
      </div>
    </div>
  );
});

export { ProfileView };
