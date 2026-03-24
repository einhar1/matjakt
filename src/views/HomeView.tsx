
import { useState } from 'react';
import '../home.css'
import '../style.css'
import { NavbarView } from './NavbarView.tsx';
import { OfferCard, type OfferItem } from '../components/OfferCard';

export type HomeViewProps = {
  offers: OfferItem[];
  onSearch: (query: string) => void;
  onLoginClick: () => void;
  onCartClick: () => void;
  cartItemCount?: number;
}

function HomeView(props: HomeViewProps) {

  const [showAll, setShowAll] = useState(false);

  function handleOpenModal() {
    setShowAll(true);
  }

  function handleCloseModal() {
    setShowAll(false)
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      setShowAll(false)
    }
  }

  const carouselItems = [...props.offers, ...props.offers];

  return (
    <div className="home-wrapper">
      <NavbarView 
      onSearch={props.onSearch}
      onLoginClick={props.onLoginClick}
      onCartClick={props.onCartClick}
      cartItemCount={props.cartItemCount} 
      />

      <div className="home-container">
        <section className="home-hero">
          <div className="badge">Data driven grocery optimization</div>
          <h1>Realtidspriser.<br/><span className="highlight-text">Optimerade inköp.</span></h1>
          <p>
            Automatiserad insamling från <strong>ICA, Coop, Willys och Hemköp</strong>. 
            Jämför, bygg din matkasse och sluta gissa var det är billigast!
          </p>
        </section>

        <section className="home-offers">
          <div className="section-header">
            <h2>Veckans klipp</h2>
            <div className='section-header-row'>
              <span className='badge live-indicator'>
                <span className='dot'></span> 
                Live Data
              </span>
              <button className='view-all-btn' onClick={handleOpenModal}>
                  Visa alla →
              </button>
            </div>
            <div className='carousel-view'>
              <div className='carousel-track'>
                {carouselItems.map((offer, index) => (
                  <OfferCard 
                    key={`carousel-${offer.currentPrice.store_id}-${offer.currentPrice.product_key}-${index}`} 
                    offer={offer} 
                  />
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className='start'>
          <button className='start-btn'></button>
        </section>
      </div>

      {showAll && (
        <div className='modal-overlay' onClick={handleOverlayClick}>
          <div className='modal-content'>
            <button className='modal-close-btn' onClick={handleCloseModal}>
              ← Back to home
            </button>
            <div className='modal-header'>
              <h2>Veckans klipp</h2>
            </div>
            <div className='modal-grid'>
              {props.offers.map((offer, index) => (
                <OfferCard
                  key={`modal-${offer.currentPrice.store_id}-${offer.currentPrice.product_key}-${index}`} 
                  offer={offer} 
                />
              ))}
            </div>
        </div>
      </div>)}
    </div>
  );
}

export { HomeView };