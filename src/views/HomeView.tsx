
import { useState } from 'react';
import '../home.css'
import '../style.css'
import type { Product, CurrentPrice, Store } from '../types/database';
import { NavbarView } from './NavbarView.tsx';

export type OfferItem = {
  product: Product;
  store: Store;
  currentPrice: CurrentPrice;
}

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

  function renderPrices(offer: OfferItem) {
    if (offer.currentPrice.promo_price) {
      return (
        <>
          <span className='home-price-promo'>
            {offer.currentPrice.promo_price} kr
          </span>
          <span className='home-price-old'>
            {offer.currentPrice.price} kr
          </span>
        </>
      );
    }
    return (
      <span className='home-price'>
        {offer.currentPrice.price} kr
      </span>
    );
  }

  const carouselItems = [...props.offers, ...props.offers];

  function renderOfferCard(offer: OfferItem) {
    return (
      <div
        key={`${offer.currentPrice.store_id}-${offer.currentPrice.product_key}`}
        className='home-offer-card'
      >
        <span className='home-offer-store'>
          {offer.store.store_name}
        </span>
        <h3>{offer.product.name}</h3>
        {offer.product.brand && (
          <p className='home-offer-brand'>{offer.product.brand}</p>
        )}
        <div className='home-offer-prices'>
          {renderPrices(offer)}
        </div>
        <button className='home-offer-btn'>Lägg till i matkasse</button>
      </div>
    )
  }

  function renderModalOfferCard(offer: OfferItem, index: number) {
    return (
      <div
        key={`modal-${offer.currentPrice.store_id}-${offer.currentPrice.product_key}-${index}`}
        className='home-offer-card'
      >
        <span className='home-offer-store'>
          {offer.store.store_name}
        </span>
        <h3>{offer.product.name}</h3>
        {offer.product.brand && (
          <p className='home-offer-brand'>{offer.product.brand}</p>
        )}
        <div className='home-offer-prices'>
          {renderPrices(offer)}
        </div>
        <button className='home-offer-btn'>Lägg till i matkasse</button>
      </div>
    )
  }

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
                {carouselItems.map(renderOfferCard)}
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
              {props.offers.map(renderModalOfferCard)}
            </div>
        </div>
      </div>)}
    </div>
  );
}

export { HomeView };