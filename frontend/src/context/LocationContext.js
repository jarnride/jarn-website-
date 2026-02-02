import { createContext, useContext, useState, useEffect } from 'react';

const LocationContext = createContext(null);

// Nigerian city coordinates database
const NIGERIAN_CITIES = {
  'lagos': { lat: 6.5244, lng: 3.3792 },
  'ikeja': { lat: 6.6018, lng: 3.3515 },
  'victoria island': { lat: 6.4281, lng: 3.4219 },
  'lekki': { lat: 6.4698, lng: 3.5852 },
  'abuja': { lat: 9.0579, lng: 7.4951 },
  'kano': { lat: 12.0022, lng: 8.5920 },
  'ibadan': { lat: 7.3775, lng: 3.9470 },
  'port harcourt': { lat: 4.8156, lng: 7.0498 },
  'benin city': { lat: 6.3350, lng: 5.6037 },
  'kaduna': { lat: 10.5105, lng: 7.4165 },
  'enugu': { lat: 6.4584, lng: 7.5464 },
  'onitsha': { lat: 6.1667, lng: 6.7833 },
  'jos': { lat: 9.8965, lng: 8.8583 },
  'ilorin': { lat: 8.4966, lng: 4.5426 },
  'warri': { lat: 5.5167, lng: 5.7500 },
  'calabar': { lat: 4.9517, lng: 8.3220 },
  'uyo': { lat: 5.0377, lng: 7.9128 },
  'owerri': { lat: 5.4836, lng: 7.0333 },
  'abeokuta': { lat: 7.1475, lng: 3.3619 },
  'akure': { lat: 7.2571, lng: 5.2058 },
  'oshogbo': { lat: 7.7827, lng: 4.5418 },
  'sokoto': { lat: 13.0622, lng: 5.2339 },
  'maiduguri': { lat: 11.8333, lng: 13.1500 },
  'zaria': { lat: 11.0855, lng: 7.7199 },
  'aba': { lat: 5.1167, lng: 7.3667 },
  'bauchi': { lat: 10.3158, lng: 9.8442 },
  'yola': { lat: 9.2035, lng: 12.4954 },
  'anambra': { lat: 6.2209, lng: 6.9370 },
  'nigeria': { lat: 9.0820, lng: 8.6753 }, // Default center
};

export const LocationProvider = ({ children }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [locationName, setLocationName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Try to get location from localStorage on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('jarnnmarket_user_location');
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        setUserLocation(parsed.coords);
        setLocationName(parsed.name || '');
      } catch (e) {
        console.error('Failed to parse saved location:', e);
      }
    }
  }, []);

  // Request browser geolocation
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        setUserLocation(coords);
        setLoading(false);
        
        // Save to localStorage
        localStorage.setItem('jarnnmarket_user_location', JSON.stringify({
          coords,
          name: 'Current Location',
          timestamp: new Date().toISOString()
        }));
        setLocationName('Current Location');
      },
      (err) => {
        setLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionDenied(true);
          setError('Location permission denied. Please enable location access or select a city.');
        } else {
          setError('Failed to get your location. Please try again or select a city.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  // Set location by city name
  const setLocationByCity = (cityName) => {
    const normalizedCity = cityName.toLowerCase().trim();
    
    // Try to find exact match or partial match
    let coords = NIGERIAN_CITIES[normalizedCity];
    
    if (!coords) {
      // Try partial match
      for (const [city, cityCoords] of Object.entries(NIGERIAN_CITIES)) {
        if (normalizedCity.includes(city) || city.includes(normalizedCity)) {
          coords = cityCoords;
          break;
        }
      }
    }
    
    if (coords) {
      setUserLocation(coords);
      setLocationName(cityName);
      localStorage.setItem('jarnnmarket_user_location', JSON.stringify({
        coords,
        name: cityName,
        timestamp: new Date().toISOString()
      }));
      return true;
    }
    
    return false;
  };

  // Calculate distance between two points using Haversine formula
  const calculateDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Get distance from user to a location string
  const getDistanceToLocation = (locationString) => {
    if (!userLocation || !locationString) return null;
    
    const normalizedLocation = locationString.toLowerCase().trim();
    
    // Try to find coordinates for the location
    let targetCoords = null;
    
    for (const [city, coords] of Object.entries(NIGERIAN_CITIES)) {
      if (normalizedLocation.includes(city)) {
        targetCoords = coords;
        break;
      }
    }
    
    if (!targetCoords) {
      // Default to Nigeria center if location not found
      targetCoords = NIGERIAN_CITIES['nigeria'];
    }
    
    return calculateDistance(
      userLocation.lat,
      userLocation.lng,
      targetCoords.lat,
      targetCoords.lng
    );
  };

  // Sort auctions by distance
  const sortByDistance = (auctions) => {
    if (!userLocation || !auctions.length) return auctions;
    
    return [...auctions].map(auction => ({
      ...auction,
      distance: getDistanceToLocation(auction.location)
    })).sort((a, b) => {
      // Items with distance come first, sorted by distance
      if (a.distance === null && b.distance === null) return 0;
      if (a.distance === null) return 1;
      if (b.distance === null) return -1;
      return a.distance - b.distance;
    });
  };

  // Format distance for display
  const formatDistance = (km) => {
    if (km === null || km === undefined) return null;
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    if (km < 10) return `${km.toFixed(1)}km away`;
    return `${Math.round(km)}km away`;
  };

  const clearLocation = () => {
    setUserLocation(null);
    setLocationName('');
    localStorage.removeItem('jarnnmarket_user_location');
  };

  return (
    <LocationContext.Provider value={{
      userLocation,
      locationName,
      loading,
      error,
      permissionDenied,
      requestLocation,
      setLocationByCity,
      getDistanceToLocation,
      sortByDistance,
      formatDistance,
      clearLocation,
      cities: Object.keys(NIGERIAN_CITIES).filter(c => c !== 'nigeria')
    }}>
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
