
import { useState } from 'react';
import '../home.css'
import '../style.css'
import { OfferCard, type OfferItem } from '../components/OfferCard';
import { PostalCodeInput } from '../components/PostalCodeInput';
import { userModel, type userModelType } from '../models/userModel.ts';
import { Modal } from '../components/Modal.tsx'
import { LocationModal, type LocationResult } from '../components/LocationModal.tsx';

export type HomeViewProps = {
  offers: OfferItem[];
  userModel: userModelType
}

function HomeView(props: HomeViewProps) {
  const [showAll, setShowAll] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const userModel = props.userModel;
  function handleOpenModal() {
    setShowAll(true);
  }

  function handleCloseModal() {
    setShowAll(false)
  }

  function onLocationSelectACB(location: LocationResult) {
    userModel.setLocation(location.lng, location.lat);
  }

  const carouselItems = [...props.offers, ...props.offers];

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
          <button className="location-btn-home" onClick={() => setShowLocationModal(true)}>Välj område</button>
        </section>

        <section className="home-offers">
          <div className="section-header">
            <h2>Veckans klipp{userModel.city !== '' ? ' — ' + userModel.city : ''}</h2>
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

      <Modal
        isOpen={showAll}
        onClose={handleCloseModal}
      >
        <>
          <button className='modal-close-btn' onClick={handleCloseModal}>
            ← Back to home
          </button>
          <div className='modal-header'>
            <h2>Veckans klipp{userModel.city !== '' ? ' — ' + userModel.city : ''}</h2>
          </div>
          <div className='modal-grid'>
            {props.offers.map((offer, index) => (
              <OfferCard
                key={`modal-${offer.currentPrice.store_id}-${offer.currentPrice.product_key}-${index}`} 
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
        onMaxDistanceSet={(distance) => userModel.setMaxDistance(distance)}
      />
    </div>
  );
}

export { HomeView };