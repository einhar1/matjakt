import { useEffect, useState } from "react";
import "../style.css";
import "./LocationModal.css";
import { PostalCodeInput } from "./PostalCodeInput";

export type LocationResult = {
  lat: number;
  lng: number;
  name: string;
}

export function LocationModal({ 
  isOpen, 
  onClose, 
  onLocationSelect 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onLocationSelect: (location: LocationResult) => void; 
}) {

  const [isLoading, setIsLoading] = useState(false);



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
          name: 'Din nuvarande plats'
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
            className="current-location-btn" 
            onClick={handleCurrentLocation}
            disabled={isLoading}
          >
            {isLoading ? 'Hämtar plats...' : 'Använd min nuvarande plats'}
          </button>
          <PostalCodeInput/>
        </div>
      </div>
    </div>
  );
}