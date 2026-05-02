
import { useState } from 'react';
import '../home.css'
import '../style.css'
import { OfferCard } from '../components/OfferCard';
import { type userModelType } from '../models/userModel.ts';
import { Modal } from '../components/Modal.tsx'
import { LocationModal, type LocationResult } from '../components/LocationModal.tsx';
import { useBestLocalDeals } from '../hooks/HomeModalGetter.ts';
import { LoadingSpinner } from '../components/LoadingSpinner.tsx';

export type HomeViewProps = {
  userModel: userModelType;
}

function HomeView(props: HomeViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [, setVersion] = useState(0);
  const userModel = props.userModel;

  // const [refresh, setRefresh] = useState<number>(0);
  
  const {
    data: products,
    error,
    isLoading
  } = useBestLocalDeals();

  const bestOffers = products || [];
  
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

  const carouselItems = [...bestOffers.slice(0, 15), ...bestOffers.slice(0, 15)];

  return (
    <div className="home-wrapper">
      <div className="home-container">
        <section className="home-hero">
          <div className="badge">Data driven grocery optimization</div>
          <h1>Realtidspriser.<br/><span className="highlight-text">Optimerade inköp.</span></h1>
          <p>
            Automatiserad insamling från <strong>ICA, Coop, Willys och Hemköp</strong>. 
            Jämför, bygg din matkasse och sluta gissa var det är billigast!
          </p>
          <button className="btn-primary location-btn-home" onClick={() => setShowLocationModal(true)}>Välj område</button>
        </section>

        <section className="home-offers">
          <div className="section-header">
            <h2>Veckans klipp{userModel.city !== '' ? ' — ' + userModel.city : ' — Stockholm'}</h2>
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