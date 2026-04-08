import { useState } from 'react';
import '../checkout.css';
import type { StoreProduct, userModelType } from '../models/userModel';
import { Circle, MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useQuery } from '@tanstack/react-query';
import { coopSupabase, supabase } from '../utils/supabase';
import { LocationModal, type LocationResult } from '../components/LocationModal';
import type { Product } from './DetailsView';


export type CheckoutViewProps = {
  userModel: userModelType
}

interface storesData {
  store_id: number;
  store_name: string;
  lat: number;
  lon: number;
  distance_km: number;
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
  const [fuelType, setFuelType] = useState('bensin95');
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [usesAvgPrice, setUsesAvgPrice] = useState(true);
  const [, forceUpdate] = useState(false);

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

  //console.log(storePricesQuery.data)
  const storePrices = storePricesQuery.data || [];

  const shipping = 5.0;
  const subtotal = 2;
  const total = userModel.cart.length > 0 ? cart.map(item => item.avg_price).reduce((a, b) => a + b, 0) : 0;


  function onLocationSelectACB(location: LocationResult) {
    userModel.setLocation(location.lng, location.lat);
  }
  
  function onCalculateButtonClickACB(event: React.MouseEvent<HTMLButtonElement>) {
    if (userModel.usesLocation) {
      if (algorithmMethod === "average") {
        setUsesAvgPrice(true);
        forceUpdate(s => !s); // Force re-render to show avg prices
      }
      if (algorithmMethod === "area") {
        const cheapestInArea = findCheapestStores(storePrices, storesMap, userModel.cart, userModel.maxDistance);
        console.log("Cheapest in area:", cheapestInArea);
        userModel.setAlgorithmCart(cheapestInArea);
        setUsesAvgPrice(false);
        forceUpdate(s => !s); // Force re-render to show updated cart
      }
      else if (algorithmMethod === "global") {
        const cheapestGlobal = findCheapestStores(storePrices, storesMap, userModel.cart);
        console.log("Cheapest globally:", cheapestGlobal);
        userModel.setAlgorithmCart(cheapestGlobal);
        setUsesAvgPrice(false);
        forceUpdate(s => !s); // Force re-render to show updated cart
      }
    }
  }

  function displayCartItems(items: Product[] | StoreProduct[]) {

    if (usesAvgPrice) {
      return items.map((item: Product) => (
      <div key={item.product_id} className="cart-item">
        <img src={item.product_image_url} alt={item.name} className="item-image" />
        <div className="item-details">
          <h3 className="item-name">{item.name}</h3>
          <p className="item-quantity">1x</p>
        </div>
        <div className="item-price">~{item.avg_price.toFixed(2)} kr</div>
      </div>         
      ));
    }
    else {
      return (items as StoreProduct[]).map((item) => (
      <div key={item.product_id} className="cart-item">
        <img src={item.product_image_url} alt={item.name} className="item-image" />
        <div className="item-details">
          <h3 className="item-name">{item.name}</h3>
          <p className="item-quantity">1x</p>
          <p className="item-store">{item.store_name}</p>
          <p className="item-distance">{item.distance.toFixed(1)} km ifrån</p>
        </div>
        <div className="item-price-section">
          <div className="item-price">{item.price.toFixed(2)} kr</div>
          <div className="item-savings">
            {((((item.avg_price - item.price) / item.avg_price) * 100) || 0).toFixed(0)}% lägre pris
          </div>
        </div>
      </div>
      ));      
    }
  }

  return (
    <div className="checkout-wrapper">
      <div className="checkout-container">
        <div className='cart-section'>
          <h1 className="checkout-title">Granska din varukorg</h1>

          {/* Cart Items */}
          <div className="cart-items">
            {displayCartItems(usesAvgPrice ? userModel.cart : userModel.algorithmCart)}
          </div>

          {/* Order Summary */}
          <div className="order-summary">
            <div className="summary-row">
              <span className="summary-label">Färdningspris</span>
            </div>
            <div className="summary-row fuel-type-row">
              <select 
                id="fuel-type"
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="fuel-type-select"
              >
                <option value="bensin98">Bensin 98</option>
                <option value="bensin95">Bensin 95</option>
                <option value="e85">E85</option>
                <option value="diesel">Diesel</option>
              </select>
              <span className="summary-value">{shipping.toFixed(2)} kr</span>
            </div>
            <div className="summary-row total-row">
              <span className="summary-label total-label">Total</span>
              <span className="summary-value total-value">{total.toFixed(2)} kr</span>
            </div>
          </div>

          {/* Location Selection */}
          <button className="location-btn-checkout" onClick={() => setShowLocationModal(true)}>Välj område</button>

          {/* Delivery Method Selection */}
          <div className="delivery-section">
            <label htmlFor="delivery-method" className="delivery-label">Prisalgoritm</label>
            <select 
              id="delivery-method"
              value={algorithmMethod} 
              onChange={(e) => setAlgorithmMethod(e.target.value)}
              className="delivery-select"
            >
              <option value="average">Genomsnittspris</option>
              <option value="area">Bästa pris inom område (max {userModel.maxDistance} km)</option>
              <option value="shortest-path">Kortaste väg prioritet (max {userModel.maxDistance} km)</option>
              <option value="global">Bästa pris (hela Sverige)</option>
            </select>
          </div>

          {/* Pay Button */}
          <button className="calculate-button" onClick={onCalculateButtonClickACB} disabled={!userModel.usesLocation}>
            Beräkna total
          </button>
        </div>
        <div className='map-section'>
          <MapView position={[userModel.latitude, userModel.longitude]} usesLocation={userModel.usesLocation} stores={storesData} radius={userModel.maxDistance}/>
        </div>
        <LocationModal 
          isOpen={showLocationModal}
          maxDistance={userModel.maxDistance}
          onClose={() => setShowLocationModal(false)}
          onLocationSelect={onLocationSelectACB}
          onMaxDistanceSet={(distance) => userModel.setMaxDistance(distance)}
        />
      </div>
    </div>
  );
}

export default function MapView({position, usesLocation, stores, radius} : {position: [number, number], usesLocation: boolean, stores: storesData[], radius: number}) {
  const stockholmPos: [number, number] = [59.3293, 18.0686]; // Stockholm
  if (!usesLocation) {position = stockholmPos};


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
      <StoreMarkers stores={stores}/>
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
        const icon = createGroceryIcon(store.store_name, zoom);

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


function createGroceryIcon(name: string, zoom: number = 30) {

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

  const groceryIcon = L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
      ">
        <svg 
          width="${zoom*2}" 
          height="${zoom*2}" 
          viewBox="0 0 16 16" 
          fill="rgb(15, 182, 76)"
        >
          <path d="M13.35 10.48H4.5l-.24-1.25h9.13a1.24 1.24 0 0 0 1.22-1l.84-4a1.25 1.25 0 0 0-1.22-1.51H3l-.22-1.24H.5v1.25h1.25l1.5 7.84a2 2 0 0 0-1.54 1.93 2.09 2.09 0 0 0 2.16 2 2.08 2.08 0 0 0 2.13-2 2 2 0 0 0-.16-.77h5.49a2 2 0 0 0-.16.77 2.09 2.09 0 0 0 2.16 2 2 2 0 1 0 0-4zM14.23 4l-.84 4H4l-.74-4zM3.87 13.27A.85.85 0 0 1 3 12.5a.85.85 0 0 1 .91-.77.84.84 0 0 1 .9.77.84.84 0 0 1-.94.77zm9.48 0a.85.85 0 0 1-.91-.77.92.92 0 0 1 1.81 0 .85.85 0 0 1-.9.77z" />
        </svg>
        ${zoom >= 12 ? storeText : ""}
      </div>
    `,
  });
  return groceryIcon;
}

export { CheckoutView }