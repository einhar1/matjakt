import { useState } from "react";
import "../style.css";
import "./LocationModal.css";
import { PostalCodeInput } from "./PostalCodeInput";

export type LocationResult = {
  lat: number;
  lng: number;
  name: string;
  maxDistance: number;
}

export function LocationModal({ 
  isOpen, 
  maxDistance,
  onClose, 
  onLocationSelect, 
  onMaxDistanceSet
}: { 
  isOpen: boolean; 
  maxDistance: number,
  onClose: () => void; 
  onLocationSelect: (location: LocationResult) => void; 
  onMaxDistanceSet: (distance: number) => void;
}) {

  const [isLoading, setIsLoading] = useState(false);
  const [localMaxDistance, setLocalMaxDistance] = useState(maxDistance);



  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationResult = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          name: 'Din nuvarande plats',
          maxDistance: maxDistance
        };
        console.log(location);
        onLocationSelect(location);
        setIsLoading(false);
        onClose();
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Kunde inte hämta din plats. Kontrollera att du har gett tillstånd.');
        setIsLoading(false);
      }
    );
  };

  if (!isOpen) return null;

  return (
    <div className="location-modal-overlay" onClick={onClose}>
      <div className="location-modal" onClick={(e) => e.stopPropagation()}>
        <div className="location-modal-header">
          <h3>Välj plats</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="location-modal-content">
          <button 
            className="btn-primary current-location-btn"
            onClick={handleCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? 'Hämtar plats...' : 'Använd min nuvarande plats'}
          </button>
          <div className="postal-code-input-wrapper">
            <PostalCodeInput/>
          </div>
          <div className="max-distance-slider">
            <label htmlFor="maxDistance">Max avstånd: {localMaxDistance} km</label>
            <input 
              type="range" 
              id="maxDistance" 
              min="1" 
              max="300" 
              value={localMaxDistance} 
              onChange={(e) => setLocalMaxDistance(Number(e.target.value))} 
              onMouseUp={() => onMaxDistanceSet(localMaxDistance)}
              onTouchEnd={() => onMaxDistanceSet(localMaxDistance)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}