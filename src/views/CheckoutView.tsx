import { useEffect, useState } from 'react';
import '../checkout.css';
import type { StoreProduct, userModelType } from '../models/userModel';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMapEvents, Polyline } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from '@tanstack/react-query';
import { coopSupabase, supabase } from '../utils/supabase';
import { LocationModal, type LocationResult } from '../components/LocationModal';
import type { Product } from './DetailsView';
import { useNavigate } from 'react-router-dom';
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { createPortal } from 'react-dom';

export type CheckoutViewProps = {
  userModel: userModelType
}

interface storesData {
  store_id: number;
  store_name: string;
  lat: number;
  lon: number;
  distance_km: number;
  isSelected?: boolean;
}

interface storePriceData {
  product_key: any;
  store_id: any;
  price: any;
  stores: {
      store_name: any;
  };
}

function CheckoutView(props: CheckoutViewProps) {

  const userModel = props.userModel;
  const cart = props.userModel.cart;
  const [algorithmMethod, setAlgorithmMethod] = useState('average');
  const [fuelType, setFuelType] = useState('none');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [hasCalculatedWithCurAlgo, setHasCalculatedWithCurAlgo] = useState('average');
  const [showLoadingDelivery, setShowLoadingDelivery] = useState(false);
  const [, forceUpdate] = useState(false);
  const literPerKm = 0.07; // Genomsnittlig bränsleförbrukning i liter per km, justera efter behov
  const navigate = useNavigate();

  useEffect(() => {
      if (!showLoadingDelivery) return;
      
      const timer = setTimeout(() => {
          setShowLoadingDelivery(false);
      }, 700);
      
      return () => clearTimeout(timer);  // Cleanup if component unmounts
  }, [showLoadingDelivery]);

  const storesQuery = useQuery({
    queryKey: ["stores_radius", userModel.latitude, userModel.longitude, userModel.maxDistance],
    queryFn: async () => {

      const allStores = [];
      let distance = userModel.maxDistance
      if (algorithmMethod === "global" || algorithmMethod === "average") {
        distance = 3000; // 3000 km should cover all of Sweden
      }

      for (const db of [supabase, coopSupabase]) {
        const { data: stores, error: storesError } = await db.rpc(
          "get_stores_within_radius",
          {
            user_lat: userModel.latitude,
            user_lon: userModel.longitude,
            radius_km: distance,
          }
        );

        if (storesError) {
          console.log(storesError);
          continue;
        }

        allStores.push(...stores);
      }

      return allStores as storesData[];
    },
    enabled: (!!userModel.latitude && !!userModel.longitude && !!userModel.maxDistance),
  })

  const storePricesQuery = useQuery({
    queryKey: ["storePrices", userModel.cart.map(item => item.product_key), storesQuery.data?.map(store => store.store_id)],
    queryFn: async () => {
      
      if (storesData.length === 0) { return [] };
      const product_keys = userModel.cart.map(item => item.product_key)
      const store_ids = storesData.map(store => store.store_id);

      let allStorePrices = [];

      for (const db of [supabase, coopSupabase]) {
        const { data: storePrices, error: storePricesError } = await db
          .from("current_prices")
          .select(`
            product_key,
            store_id,
            price,
            stores (
              store_name
            )
          `)
          .in("product_key", product_keys);

        if (storePricesError) {
          console.log(storePricesError);
          continue;
        }

        allStorePrices.push(...storePrices);
      }

      return allStorePrices as unknown as storePriceData[]; // Force conversion
    },
    enabled: userModel.usesLocation
  });

  const fuelQuery = useQuery({
    queryKey: ["fuelPrice"],
    queryFn: async () => {
      const { data: fuelData, error: fuelError } = await supabase
        .from("fuel_prices")
        .select("fuel_type, price_sek");

      if (fuelError) {
        console.log(fuelError);
        return 0;
      }

      const fuelMap = new Map(fuelData.map(item => [item.fuel_type, item.price_sek]));
      return fuelMap as Map<string, number>;
    }
  });

  const stops = userModel.algorithmCart.map(item => ({ lat: item.lat, lng: item.lon })) as LatLng[];
  stops.unshift({ lat: userModel.latitude, lng: userModel.longitude }); // Add user's location as the first stop

  const routeQuery = useQuery({
    queryKey: ["route", stops],
    queryFn: async () => fetchRoute(stops),
    enabled: !!stops && (hasCalculatedWithCurAlgo === "shortest-path" || hasCalculatedWithCurAlgo === "area") && userModel.algorithmCart.length > 0,
  });




  if (storesQuery.isLoading) {
    return <div>Loading...</div>;
  }
  if (storesQuery.isError) {
    return <div>Error loading stores</div>;
  }

  const storesData = storesQuery.data || [];
  const storesMap = new Map(storesData.map(store => [store.store_id, store]));

  if (storePricesQuery.isLoading) {
    return <div>Loading...</div>;
  }
  if (storePricesQuery.isError) {
    return <div>Error loading store price data...</div>;
  }

  if (fuelQuery.isLoading) {
    return <div>Loading...</div>;
  }
  if (fuelQuery.isError) {
    return <div>Error loading fuel price...</div>;
  }

  //if (routeQuery.isLoading) return <div>Loading route data...</div>;
  if (routeQuery.isError) return <div>Error loading route data...</div>;

  const anyQueryIsLoading = storesQuery.isLoading || storePricesQuery.isLoading || fuelQuery.isLoading || routeQuery.isLoading;

  const routeData = routeQuery.data;
  const fuelMap = fuelQuery.data || new Map();

  //console.log(storePricesQuery.data)
  const storePrices = storePricesQuery.data || [];
  const travelCost = calculateFuelCost(routeData, fuelType, fuelMap, literPerKm);

  function getTotal() {
    if (hasCalculatedWithCurAlgo === "average") {
      return userModel.cart.length > 0 ? cart.map(item => item.avg_price * (item.qty || 1)).reduce((a, b) => a + b, 0) : 0;  
    }
    else if (hasCalculatedWithCurAlgo === "area" || hasCalculatedWithCurAlgo === "global") { 
      return userModel.algorithmCart.length > 0 ? userModel.algorithmCart.map(item => (item.price * (item.qty || 1))).reduce((a, b) => a + b, 0) + travelCost : 0; 
    }
  }

  function getAvgTotal() {
    return userModel.cart.length > 0 ? cart.map(item => item.avg_price * (item.qty || 1)).reduce((a, b) => a + b, 0) : 0;
  }

  function getSavings() {
    return getAvgTotal() - (getTotal() || 0);
  }

  function onLocationSelectACB(location: LocationResult) {
    userModel.setLocation(location.lng, location.lat);
  }

  function onAlgorithmChangeACB(e: React.ChangeEvent<HTMLSelectElement>) {
    setAlgorithmMethod(e.target.value);
  }
  
  function onCalculateButtonClickACB(event: React.MouseEvent<HTMLButtonElement>) {
    if (userModel.usesLocation) {
      if (algorithmMethod === "average") {
        setHasCalculatedWithCurAlgo("average");
        forceUpdate(s => !s); // Force re-render to show avg prices
        setShowLoadingDelivery(true);
      }
      if (algorithmMethod === "area") {
        const cheapestInArea = findCheapestStores(storePrices, storesMap, userModel.cart, userModel.maxDistance);
        console.log("Cheapest in area:", cheapestInArea);
        userModel.setAlgorithmCart(cheapestInArea);
        setHasCalculatedWithCurAlgo("area");
        forceUpdate(s => !s); // Force re-render to show updated cart
        setShowLoadingDelivery(true);
      }
      else if (algorithmMethod === "global") {
        const cheapestGlobal = findCheapestStores(storePrices, storesMap, userModel.cart);
        console.log("Cheapest globally:", cheapestGlobal);
        userModel.setAlgorithmCart(cheapestGlobal);
        setHasCalculatedWithCurAlgo("global");
        forceUpdate(s => !s); // Force re-render to show updated cart
        setShowLoadingDelivery(true);
      }
    }
  }

  function removeItemACB(productId: string) {
    userModel.removeFromCart(productId);
    userModel.setAlgorithmCart(userModel.algorithmCart.filter(item => item.product_id !== productId));
    forceUpdate(s => !s);
  }
  function onFuelChangeACB(e: React.ChangeEvent<HTMLSelectElement>) {
    setFuelType(e.target.value);
  }

  function downloadGroceryListPDF() {
    const doc = document.createElement('div');
    doc.innerHTML = `
      <h1>Varukorg sammandrag</h1>
      <p>Algoritm: ${hasCalculatedWithCurAlgo === 'area' ? 'Närmaste område' : 'Bästa pris (hela Sverige)'}</p>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <thead>
          <tr style="border-bottom: 2px solid #000;">
            <th style="text-align: left; padding: 8px;">Produkt</th>
            <th style="text-align: left; padding: 8px;">Butik</th>
            <th style="text-align: center; padding: 8px;">Mängd</th>
            <th style="text-align: right; padding: 8px;">Pris</th>
          </tr>
        </thead>
        <tbody>
          ${userModel.algorithmCart.map(item => `
            <tr style="border-bottom: 1px solid #ccc;">
              <td style="padding: 8px;">${item.name}</td>
              <td style="padding: 8px;">${item.store_name}</td>
              <td style="text-align: center; padding: 8px;">${item.qty}x</td>
              <td style="text-align: right; padding: 8px;">${(item.price * item.qty).toFixed(2)} kr</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <div style="margin-top: 20px; text-align: right;">
        <strong>Total kostnad: ${userModel.algorithmCart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)} kr</strong>
      </div>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Varukorg sammandrag</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f0f0f0; font-weight: bold; }
            .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Varukorg sammandrag</h1>
          <p><strong>Algoritm:</strong> ${hasCalculatedWithCurAlgo === 'area' ? 'Närmaste område' : 'Bästa pris (hela Sverige)'}</p>
          <table>
            <thead>
              <tr>
                <th>Produkt</th>
                <th>Butik</th>
                <th>Mängd</th>
                <th style="text-align: right;">Pris</th>
              </tr>
            </thead>
            <tbody>
              ${userModel.algorithmCart.map(item => `
                <tr>
                  <td>${item.name}</td>
                  <td>${item.store_name}</td>
                  <td style="text-align: center;">${item.qty}x</td>
                  <td style="text-align: right;">${(item.price * item.qty).toFixed(2)} kr</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Total kostnad: ${userModel.algorithmCart.reduce((sum, item) => sum + (item.price * item.qty), 0).toFixed(2)} kr</div>
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }

  function onCartItemClickACB(item: Product) {
    navigate(`/details/${item.product_id}`);
  }

  function displayCartItems() {

    if (hasCalculatedWithCurAlgo === "average") {
      return userModel.cart.map((item: Product) => (
      <div key={item.product_id} className="cart-item">
        <img src={item.product_image_url} alt={item.name} className="item-image" onClick={() => onCartItemClickACB(item)}/>
        <div className="item-details">
          <h3 className="item-name" onClick={() => onCartItemClickACB(item)}>{item.name}</h3>
          <p className="item-quantity">{item.qty || 1}x</p>
        </div>
        <div className="item-price">~{(item.avg_price * (item.qty || 1)).toFixed(2)} kr</div>
        <button className="item-remove" onClick={() => removeItemACB(item.product_id)} aria-label="Ta bort">✕</button>
      </div>
      ));
    }
    else if (hasCalculatedWithCurAlgo === "area") {
      // For "area" algorithm, show all products and mark out-of-range ones
      const algorithmCartMap = new Map((userModel.algorithmCart).map(item => [item.product_key, item]));

      return userModel.cart.map((cartItem) => {
        const algorithmItem = algorithmCartMap.get(cartItem.product_key);
        if (algorithmItem) {
          const reducedPercentage = ((((algorithmItem.avg_price - algorithmItem.price) / algorithmItem.avg_price) * 100) || 0);
          const itemsSavingsClassName = reducedPercentage > 0 ? "item-savings" : "item-savings no-savings";
          return (
            <div key={cartItem.product_id} className="cart-item">
              <img src={algorithmItem.product_image_url} alt={algorithmItem.name} className="item-image" onClick={() => onCartItemClickACB(algorithmItem)}/>
              <div className="item-details">
                <h3 className="item-name" onClick={() => onCartItemClickACB(algorithmItem)}>{algorithmItem.name}</h3>
                <p className="item-quantity">{algorithmItem.qty || 1}x</p>
                <p className="item-store">{algorithmItem.store_name}</p>
                <p className="item-distance">{algorithmItem.distance.toFixed(1)} km ifrån</p>
              </div>
              <div className="item-price-section">
                <div className="item-price">{(algorithmItem.price * (algorithmItem.qty || 1)).toFixed(2)} kr</div>
                <div className={`${itemsSavingsClassName}`}>
                  {reducedPercentage > 0 ? `${reducedPercentage.toFixed(0)}% lägre pris` : `${Math.abs(reducedPercentage).toFixed(0)}% högre pris`}
                </div>
              </div>
              <button className="item-remove" onClick={() => removeItemACB(cartItem.product_id)} aria-label="Ta bort">✕</button>
            </div>
          );
        } else {
          return (
            <div key={cartItem.product_id} className="cart-item out-of-range">
              <img src={cartItem.product_image_url} alt={cartItem.name} className="item-image" onClick={() => onCartItemClickACB(cartItem)}/>
              <div className="item-details">
                <h3 className="item-name" onClick={() => onCartItemClickACB(cartItem)}>{cartItem.name}</h3>
                <p className="item-quantity">{cartItem.qty || 1}x</p>
              </div>
              <div className="item-price">Utanför område</div>
              <button className="item-remove" onClick={() => removeItemACB(cartItem.product_id)} aria-label="Ta bort">✕</button>
            </div>
          );
        }
      });
    }
    else {
      // For other algorithms, just display the items from algorithmCart
      return userModel.algorithmCart.map((item) => {
        const reducedPercentage = ((((item.avg_price - item.price) / item.avg_price) * 100) || 0);
        const itemsSavingsClassName = reducedPercentage > 0 ? "item-savings" : "item-savings no-savings";
        return (
          <div key={item.product_id} className="cart-item">
            <img src={item.product_image_url} alt={item.name} className="item-image" onClick={() => onCartItemClickACB(item)}/>
            <div className="item-details">
              <h3 className="item-name" onClick={() => onCartItemClickACB(item)}>
                {item.name}
              </h3>
              <p className="item-quantity">{item.qty || 1}x</p>
              <p className="item-store">{item.store_name}</p>
              <p className="item-distance">{item.distance.toFixed(1)} km ifrån</p>
            </div>
            <div className="item-price-section">
              <div className="item-price">{(item.price * (item.qty || 1)).toFixed(2)} kr</div>
              <div className={itemsSavingsClassName}>
                {reducedPercentage > 0 ? `${reducedPercentage.toFixed(0)}% lägre pris` : `${Math.abs(reducedPercentage).toFixed(0)}% högre pris`}
              </div>
            </div>
            <button className="item-remove" onClick={() => removeItemACB(item.product_id)} aria-label="Ta bort">✕</button>
          </div>          
        );
      });
    }
  }

  const checkoutContainerClassName = `checkout-container ${showLoadingDelivery ? 'hidden' : ''}`;

  return (
    <div className="checkout-wrapper">
      <div className={checkoutContainerClassName}>
        <div className='cart-section'>
          <h1 className="checkout-title">Granska din varukorg</h1>

          {/* Cart Items */}
          <div className="cart-items">
            {displayCartItems()}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="summary-row">
              <span className="summary-label">Bensin</span>
            </div>
            
            {/* Fuel Selection */}
            <div className={`fuel-selection-block ${!(routeData && hasCalculatedWithCurAlgo === "area") ? 'no-border' : ''}`}>
              <select 
                id="fuel-type"
                value={fuelType}
                onChange={onFuelChangeACB}
                className="fuel-type-select"
              >
                <option value="none">Ingen</option>
                <option value="bensin_95">Bensin 95</option>
                <option value="oktan_98">E85</option>
                <option value="diesel">Diesel</option>
              </select>
            </div>

            {/* Fuel Details */}
            {(routeData && hasCalculatedWithCurAlgo === "area") && (
              <div className="fuel-details-block">
                <div className="detail-row">
                  <span className="detail-label">Pris per liter:</span>
                  <span className="detail-value">{fuelMap.get(fuelType)?.toFixed(2)} kr/L</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Körsträcka:</span>
                  <span className="detail-value">{(routeData.distance / 1000).toFixed(1)} km</span>
                </div>
                <div className="detail-row travel-cost">
                  <span className="detail-label">Färdkostnad:</span>
                  <span className="detail-value travel-value">{travelCost.toFixed(2)} kr</span>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="summary-row total-row">
              <span className="summary-label total-label">Total</span>
              <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px'}}>
                {getSavings() > 0 && (
                  <span className="savings-badge savings-positive">✓ Sparar {getSavings().toFixed(2)} kr</span>
                )}
                {getSavings() < 0 && (
                  <span className="savings-badge savings-negative">⚠ +{Math.abs(getSavings()).toFixed(2)} kr</span>
                )}
                <span className="summary-value total-value">{getTotal()?.toFixed(2)} kr</span>
              </div>
            </div>
          </div>

          {/* Location Selection */}
          <button className="btn-secondary location-btn-checkout" onClick={() => setShowLocationModal(true)}>Välj område</button>

          {/* Delivery Method Selection */}
          <div className="delivery-section">
            <label htmlFor="delivery-method" className="delivery-label">Prisalgoritm</label>
            <select 
              id="delivery-method"
              value={algorithmMethod} 
              onChange={onAlgorithmChangeACB}
              className="delivery-select"
            >
              <option value="average">Genomsnittspris</option>
              <option value="area">Bästa pris inom område (max {userModel.maxDistance} km)</option>
              <option value="shortest-path">Kortaste väg prioritet (max {userModel.maxDistance} km)</option>
              <option value="global">Bästa pris (hela Sverige)</option>
            </select>
          </div>

          {/* Pay Button */}
          <button className="btn-primary calculate-button" onClick={onCalculateButtonClickACB} disabled={!userModel.usesLocation}>
            Beräkna total
          </button>
        </div>
        <div className='map-section'>
          <div className='map-container'>
            <MapView 
              position={[userModel.latitude, userModel.longitude]} 
              usesLocation={userModel.usesLocation} stores={storesData} 
              radius={userModel.maxDistance}
              hasCalculatedWithCurAlgo={hasCalculatedWithCurAlgo}
              algorithmCart={userModel.algorithmCart}
              routeData={routeData?.coordinates || []}
              stops={stops}
              />
          </div>
          {hasCalculatedWithCurAlgo !== 'average' && userModel.algorithmCart.length > 0 && (
            <div className='grocery-list-section'>
              <div className='grocery-list-header'>
                <h3>Varukorg sammandrag</h3>
                <button className='btn-primary' onClick={downloadGroceryListPDF}>
                  Ladda ner PDF
                </button>
              </div>
              <div className='grocery-list-container'>
                {userModel.algorithmCart.map((item) => (
                  <div key={`${item.product_key}-${item.store_id}`} className='grocery-item'>
                    <div className='grocery-item-info'>
                      <p className='grocery-item-name'>{item.name}</p>
                      <p className='grocery-item-store'>{item.store_name}</p>
                    </div>
                    <div className='grocery-item-price'>
                      <p className='grocery-item-qty'>{item.qty}x</p>
                      <p className='grocery-item-cost'>{(item.price * item.qty).toFixed(2)} kr</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <LocationModal 
          isOpen={showLocationModal}
          maxDistance={userModel.maxDistance}
          onClose={() => setShowLocationModal(false)}
          onLocationSelect={onLocationSelectACB}
          onMaxDistanceSet={(distance) => userModel.setMaxDistance(distance)}
        />
      </div>
      {showLoadingDelivery && createPortal(
        <div className="loading-delivery">
          <LoadingDelivery />
        </div>,
        document.body
      )}
    </div>
  );
}

export default function MapView({position, usesLocation, stores, radius, hasCalculatedWithCurAlgo, algorithmCart, routeData, stops}: 
  {position: [number, number], usesLocation: boolean, stores: storesData[], radius: number, hasCalculatedWithCurAlgo: string, algorithmCart: StoreProduct[], routeData: LatLng[], stops: LatLng[]}
) {
  const stockholmPos: [number, number] = [59.3293, 18.0686]; // Stockholm
  if (!usesLocation) {position = stockholmPos};

  if (hasCalculatedWithCurAlgo === "area" || hasCalculatedWithCurAlgo === "global") {
    stores = stores.map(store => {
      const matchingProduct = algorithmCart.find(item => item.store_name === store.store_name);
      return {
        ...store,
        isSelected: !!matchingProduct
      }
    });
  }

  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      <Polyline 
        positions={routeData} 
        pathOptions={{ color: 'rgba(77, 145, 233, 0.8)', weight: 5 }} 
      />
      <StoreMarkers stores={stores}/>
      <StopMarkers stops={stops.slice(0, 1)} />
      <Circle
        center={position}
        radius={radius * 1000} // Convert km to meters
        pathOptions={{ color: 'rgba(21, 87, 173, 0.5)', fillColor: 'rgba(21, 87, 173, 0.5)' }}
      />
    </MapContainer>
  );
}

  function findCheapestStores(
    data: storePriceData[], 
    storesData: Map<number, storesData>, 
    cart: Product[] = [],
    range?: number
  ): StoreProduct[] {
    
    const cheapestProducts: Map<string, StoreProduct> = new Map();
    const cartMap = new Map(cart.map(item => [item.product_key, item]));

    for (const storePrice of data) {
      // If range is provided, check if store is within range
      if (range !== undefined) {
        const store = storesData.get(storePrice.store_id);
        if (!store || store.distance_km > range) {
          continue; // Skip stores outside range
        }
      }

      const store = storesData.get(storePrice.store_id);
      if (!store?.store_name || !store.lat || !store.lon || !store.distance_km) {
        continue;
      }
      // If product not in map yet, add it
      if (!cheapestProducts.has(storePrice.product_key)) {
        cheapestProducts.set(
          storePrice.product_key, 
          {...cartMap.get(storePrice.product_key), 
            store_name: store?.store_name || "Okänd butik",
            lat: store?.lat || 0,
            lon: store?.lon || 0,
            price: storePrice.price,
            distance: store?.distance_km || 0,

          } as StoreProduct
        );
      } else {
        // Compare prices and update if cheaper
        const current = cheapestProducts.get(storePrice.product_key)!;
        if (storePrice.price < current.price) {
          cheapestProducts.set(
            storePrice.product_key, 
            {...cartMap.get(storePrice.product_key), 
              store_name: store?.store_name || "Okänd butik",
              lat: store?.lat || 0,
              lon: store?.lon || 0,
              price: storePrice.price,
              distance: store?.distance_km || 0,

            } as StoreProduct
          );
        }
        // If prices are equal, prefer the one with shorter distance
        else if (storePrice.price === current.price && store?.distance_km !== undefined && current.distance !== undefined) {
          if (store.distance_km < current.distance) {
            cheapestProducts.set(
              storePrice.product_key, 
              {...cartMap.get(storePrice.product_key), 
                store_name: store?.store_name || "Okänd butik",
                lat: store?.lat || 0,
                lon: store?.lon || 0,
                price: storePrice.price,
                distance: store?.distance_km || 0,
              } as StoreProduct
            );
          }
        }
      }
    }

    return Array.from(cheapestProducts.values());
  }

function StopMarkers({ stops }: { stops: LatLng[] }) {
  const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41], // bottom center of the icon
    popupAnchor: [1, -34],
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
  });
  return (
    <>
      {stops.map((stop, index) => (
        <Marker key={index} position={stop} icon={icon} />
      ))}
    </>
  );
}


function StoreMarkers({ stores }: { stores: storesData[] }) {
  const [zoom, setZoom] = useState(12);

  useMapEvents({
    zoomend: (e) => {
      setZoom(e.target.getZoom());
    },
  });

  return (
    <>
      {stores.map((store) => {
        const icon = createGroceryIcon(store.store_name, store.isSelected, zoom);

        return (
          <Marker
            key={store.store_id}
            position={[store.lat, store.lon]}
            icon={icon}
          />
        );
      })}
    </>
  );
}


function createGroceryIcon(name: string, isSelected: boolean | undefined, zoom: number = 30) {

  const groceryColor = !!isSelected ? "rgba(252, 255, 46, 0.7)" : "rgba(15, 182, 76, 0.6)";

  const storeText = `
    <div style="
      margin-top:4px;
      background:rgba(255,255,255,0.8);
      padding:2px 6px;
      border-radius:6px;
      font-size:10px;
      font-weight:600;
      color:rgb(0, 58, 21);
      box-shadow:0 2px 6px rgba(0,0,0,0.15);
      white-space: nowrap;
      display: inline-block;
    ">
      ${name}
    </div>
  `;

  const glowId = `glow-${name.replace(/\W+/g, "_")}-${zoom}`;

  const groceryIcon = L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
      ">
        <svg 
          width="${zoom * 2}" 
          height="${zoom * 2}" 
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter id="${glowId}" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <path
            d="M13.35 10.48H4.5l-.24-1.25h9.13a1.24 1.24 0 0 0 1.22-1l.84-4a1.25 1.25 0 0 0-1.22-1.51H3l-.22-1.24H.5v1.25h1.25l1.5 7.84a2 2 0 0 0-1.54 1.93 2.09 2.09 0 0 0 2.16 2 2.08 2.08 0 0 0 2.13-2 2 2 0 0 0-.16-.77h5.49a2 2 0 0 0-.16.77 2.09 2.09 0 0 0 2.16 2 2 2 0 1 0 0-4zM14.23 4l-.84 4H4l-.74-4zM3.87 13.27A.85.85 0 0 1 3 12.5a.85.85 0 0 1 .91-.77.84.84 0 0 1 .9.77.84.84 0 0 1-.94.77zm9.48 0a.85.85 0 0 1-.91-.77.92.92 0 0 1 1.81 0 .85.85 0 0 1-.9.77z"
            fill="${groceryColor}"
            filter="url(#${glowId})"
          />
        </svg>
        ${zoom >= 12 ? storeText : ""}
      </div>
    `,
  });
  return groceryIcon;
}
type LatLng = { lat: number; lng: number };
type routeDataType = { coordinates: LatLng[]; distance: number; duration: number };

export async function fetchRoute(stops: LatLng[]) : Promise<routeDataType> {
  if (stops.length < 2) return { coordinates: [], distance: 0, duration: 0 };

  const coordString = stops
    .map((p) => `${p.lng},${p.lat}`) // OSRM = lng,lat
    .join(";");

  const url =
    `https://router.project-osrm.org/route/v1/driving/${coordString}` +
    `?overview=full&geometries=geojson`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch route");

  const data = await res.json();

  const coordinates = data.routes[0].geometry.coordinates;
  const routeData = {
    coordinates: coordinates.map(([lng, lat]: [number, number]) => ({ lat, lng })) as LatLng[],
    distance: data.routes[0].distance as number,
    duration: data.routes[0].duration as number,
  } as routeDataType;

  // Convert to Leaflet format [lat, lng]
  return routeData;
}

function calculateFuelCost(routeData: routeDataType | undefined, fuelType: string, fuelMap: Map<string, number>, literPerKm: number = 0.07): number {
  if (!routeData) return 0;
  const fuelPrice = fuelMap.get(fuelType) || 0;
  const totalLiters = (routeData.distance / 1000) * literPerKm;
  return totalLiters * fuelPrice;
}

export function LoadingDelivery() {
  return (
    <DotLottieReact 
      src='src/assets/DeliveryLoading.lottie'
      className='loading-delivery'
      autoplay
    />
  );
}


export { CheckoutView }