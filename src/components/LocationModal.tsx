import { useEffect, useState } from "react";
import "../style.css";
import "./LocationModal.css";

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
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsLoading(true);
    
    // Mock search results - in a real app, you'd use a geocoding service
    // like Google Places API, Mapbox, or OpenStreetMap Nominatim
    const mockResults: LocationResult[] = [
      { lat: 59.3293, lng: 18.0686, name: `${query}, Stockholm` },
      { lat: 59.8586, lng: 17.6389, name: `${query}, Uppsala` },
      { lat: 57.7089, lng: 11.9746, name: `${query}, Göteborg` },
      { lat: 55.6050, lng: 13.0038, name: `${query}, Malmö` },
    ].filter(result => result.name.toLowerCase().includes(query.toLowerCase()));

    // Simulate API delay
    setTimeout(() => {
      setSearchResults(mockResults);
      setIsLoading(false);
    }, 500);
  };

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

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

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
          
          <div className="search-section">
            <input
              type="text"
              placeholder="Sök efter stad eller adress..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            
            {isLoading && <div className="loading">Söker...</div>}
            
            <div className="search-results">
              {searchResults.map((result, index) => (
                <div 
                  key={index}
                  className="search-result-item"
                  onClick={() => {
                    onLocationSelect(result);
                    onClose();
                  }}
                >
                  {result.name}
                </div>
              ))}
              {searchQuery && !isLoading && searchResults.length === 0 && (
                <div className="no-results">Inga resultat hittades</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}