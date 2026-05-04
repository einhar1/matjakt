
import { useState } from 'react';
import '../home.css'
import '../style.css'
import { OfferCard } from '../components/OfferCard';
import { type userModelType } from '../models/userModel.ts';
import { Modal } from '../components/Modal.tsx'
import { LocationModal, type LocationResult } from '../components/LocationModal.tsx';
import { useBestLocalDeals } from '../hooks/useBestLocalDeals.ts';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';
import { mockOffers } from '../mockdata.ts';

export type HomeViewProps = {
  userModel: userModelType;
}

function HomeView(props: HomeViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [, setVersion] = useState(0);
  const userModel = props.userModel;
  const [showCardHelpModal, setShowCardHelpModal] = useState(false);

  // const [refresh, setRefresh] = useState<number>(0);
  
  const {
    data: products,
    error,
    isLoading
  } = useBestLocalDeals();

  const bestOffers = products || [];

  const cartQtyMap = new Map(userModel.cart.map(item => [item.product_key, item.qty]));
  
  function handleOpenModal() {
    setShowAll(true);
  }

  function handleCloseModal() {
    setShowAll(false)
  }

  function onLocationSelectACB(location: LocationResult) {
    userModel.setLocation(location.lng, location.lat);
    setVersion(v => v + 1);
  }

  function showHelpModal() {
    setShowCardHelpModal(true);
  }
  function closeCardHelpModal() {
    setShowCardHelpModal(false)
  }
  
  const carouselItems = [...bestOffers.slice(0, 15), ...bestOffers.slice(0, 15)];

  return (
    <div className="home-wrapper">
      <div className="home-container">
        <section className="home-hero">
          <div className="badge">Data driven grocery optimization</div>
          <h1>Realtidspriser.<br/><span className="highlight-text">Optimerade inköp.</span></h1>
          <p>
            Automatiserad insamling från <strong>Sveriges matbutiker</strong>.<br/> 
            Jämför, bygg din matkasse och sluta gissa var det är billigast!
          </p>
          <button className="btn-primary location-btn-home" onClick={() => setShowLocationModal(true)}>Välj område</button>
        </section>

        <section className="home-offers">
          <div className="section-header">
            <div className='klipp-header'>
              <h2>Veckans klipp{userModel.city !== '' ? ' — ' + userModel.city : ' — Stockholm'}</h2>
              <span className='help-badge' onClick={showHelpModal}>?</span>
            </div>
            <div className='section-header-row'>
              <span className='badge live-indicator'>
                <span className='dot'></span> 
                Live Data
              </span>
              <button className='view-all-btn' onClick={handleOpenModal}>
                  Visa alla →
              </button>
            </div>
            {bestOffers.length > 0 ? (
              <div className='carousel-view'>
                <div className='carousel-track'>
                  {carouselItems.map((offer, index) => (
                    <OfferCard 
                      key={`carousel-${offer.store.store_id}-${offer.product.product_key}-${index}`}
                      offer={offer} 
                      initialQuantity={cartQtyMap.get(offer.product.product_key) || 0}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className={`offers-state ${error ? 'error' : ''}`}>
                {isLoading ? <LoadingSpinner/> : 
                  error ? <span>Något gick snett! Försök igen!</span> :
                  (
                    <span>Inga deals i din närhet 🥲 <br/>
                    Ändra ort eller öka distansen i 'Välj område'</span>
                  )
                }
              </div>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={showCardHelpModal}
        onClose={closeCardHelpModal}
      >
        <>
          <div className="modal-top-bar">
            <button className='modal-back-btn' onClick={closeCardHelpModal}>
              ← Tillbaka
            </button>
            <div className='modal-header'>
              <h2>Så läser du kortet</h2>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center'}}>
            <div className='offer-card' style={{ maxWidth: '260px', pointerEvents: 'none', transform: 'scale(0.95)' }}>
              <div className={`offer-image${mockOffers[0].product.product_image_url? '' : ' no-image'}`}>
                {mockOffers[0].product.product_image_url && (
                  <img src={mockOffers[0].product.product_image_url} alt="Demo produkt"/>
                )}
              </div>
              <div className='offer-content'>
                <h3>{mockOffers[0].product.name}</h3>
                {mockOffers[0].product.brand && (
                  <p className='offer-brand'>{mockOffers[0].product.brand}</p>
                )}
                <div className='offer-prices'>
                  <span className='discount-badge'>-67%</span>
                  <div className='offer-price-row'>
                    <span className='offer-price-promo'>6,27 kr</span>
                    <span className='offer-price-old'>19,00 kr</span>
                  </div>
                </div>
                <button className="btn-primary offer-btn">
                  Lägg i varukorg
                </button>
              </div>
            </div>
          </div>

          <div className="help-legend">
            
            <div className="help-item">
              <span className="offer-card">
              </span>
              <div>
                <strong>Detaljvy</strong><br/>
                Klicka på kortet för detaljvy av produkten.
              </div>
            </div>

            <div className="help-item">
              <span className="discount-badge">-67%</span>
              <div>
                <strong>Besparing</strong><br/>
                Så mycket billigare än snittpriset i Sverige. <br/>
                Vi räknar: (snitt - ditt pris) / snitt.
              </div>
            </div>

            <div className="help-item">
              <span className="offer-price-promo">6,27 kr</span>
              <div>
                <strong>Ditt lokala pris</strong><br/>
                Lägsta priset just nu i butiker nära {userModel.getCity() !== ''? userModel.getCity() : 'Stockholm'}.
              </div>
            </div>

            <div className="help-item">
              <span className="offer-price-old">19,00 kr</span>
              <div>
                <strong>Snittpris Sverige</strong><br/>
                Genomsnittet vi sett hos butikskedjan.
              </div>
            </div>

            <div className="help-item">
              <button className="btn-primary offer-btn" style={{ pointerEvents: 'none', width: 'auto', padding: '6px 12px', fontSize: '14px' }}>
                Lägg i varukorg
              </button>
              <div>
                <strong>Lägg till i varukorg:</strong><br/>
                          1. Tryck en gång → 1 st läggs till.<br/>
                          2. Knappen blir till <strong>– 1 +</strong>. Använd den för att ändra antal.<br/>
              </div>
            </div>
          </div>
        </>
      </Modal>
      
      <Modal
        isOpen={showAll}
        onClose={handleCloseModal}
      >
        <>
          <div className="modal-top-bar">
            <button className='modal-back-btn' onClick={handleCloseModal}>
              ← Tillbaka
            </button>
            <div className='modal-header'>
              <h2>Veckans klipp{userModel.city !== '' ? ' — ' + userModel.city : ' — Stockholm'}</h2>
            </div>
          </div>
          <div className='modal-grid'>
            {bestOffers.map((offer, index) => (
              <OfferCard
                key={`modal-${offer.store.store_id}-${offer.product.product_key}-${index}`}
                offer={offer} 
                initialQuantity={cartQtyMap.get(offer.product.product_key) || 0}
              />
            ))}
          </div>
        </>
      </Modal>
      <LocationModal 
        isOpen={showLocationModal}
        maxDistance={userModel.maxDistance}
        onClose={() => setShowLocationModal(false)}
        onLocationSelect={onLocationSelectACB}
        onMaxDistanceSet={(distance) => {
          userModel.setMaxDistance(distance);
          setVersion(v => v + 1);
        }}
      />
    </div>
  );
}

export { HomeView };