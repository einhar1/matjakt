import "../style.css";
import "../details.css";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { useState } from "react";
import { observer } from 'mobx-react-lite';
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);
import { supabase, coopSupabase } from "../utils/supabase";
import { useParams } from "react-router-dom";
import { LocationModal, type LocationResult } from "../components/LocationModal";
import { useQuery } from "@tanstack/react-query";
import { type userModelType } from '../models/userModel';
import { getDistanceKm } from "../utils/distanceFormulas";
import { useToast } from '../context/ToastContext';

export type Product = {
  product_id: string,
  product_key: string,
  name: string,
  brand: string,
  pack_size: string,
  country_of_origin: string,
  product_image_url: string,
  product_information: string,
  ingredients: string,
  avg_price: number,
  qty?: number,
}

export type DetailsViewProps = {
  userModel: userModelType,
}

const DetailsView = observer(function DetailsView(props: DetailsViewProps) {
  const { productId } = useParams<{ productId: string}>();
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [factExpanded, setFactExpanded] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const { showCartToast } = useToast();

  const userModel = props.userModel;
  const cartQtyMap = new Map(userModel.cart.map(item => [item.product_key, item.qty]));
  const initialQuantity = cartQtyMap.get(productId || "") || 0;
  const [quantity, setQuantity] = useState(initialQuantity);
  const [showQuantitySelector, setShowQuantitySelector] = useState(initialQuantity > 0);

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      // 1. fetch product

      for (const db of [supabase, coopSupabase]) {
        
        const { data: product, error: productError } = await db
          .from("products")
          .select("product_id, product_key, name, brand, pack_size, country_of_origin, product_image_url, product_information, ingredients, avg_price")
          .eq("product_key", productId)
          .single();

        if (productError) {
          console.log(productError);
          continue;
        }

        if (product.product_image_url) {
          product.product_image_url = product.product_image_url.replace(".tiff", ".jpg");

        }
        

        const { data: storeData, error: storeError } = await db
          .from("current_prices")
          .select(`
            store_id,
            price,
            available,
            stores (
              store_name,
              lat,
              lon
            )
          `)
          .eq("product_key", product.product_key);  

        if (storeError) throw storeError;

        const priceAndStoreData = [];
        for (const item of storeData as unknown as { store_id: string; price: number; available: boolean; stores: { store_name: string; lat: number; lon: number } }[]) {
          priceAndStoreData.push(
            {
              store_id: item.store_id,
              price: item.price,
              available: item.available,
              store_name: item.stores.store_name,
              latitude: item.stores.lat,
              longitude: item.stores.lon,
            }
          );
        }

        return {
          product: product,
          storeData: priceAndStoreData,
        
        }    
      }
    },
    enabled: !!productId,
  })

  if (productQuery.isLoading) {
    return <div>Loading...</div>;
  }

  if (productQuery.isError) {
    return <div>Error loading product</div>;
  }

  const data = productQuery.data;
  const product = data?.product;
  const storeData = data?.storeData;

  let filteredStoreData = storeData;

  const HAS_LOCATION = userModel.latitude !== 0 && userModel.longitude !== 0;
  if (HAS_LOCATION && !!storeData) {

    filteredStoreData = storeData.filter(store => {
      const distance = getDistanceKm(userModel.latitude, userModel.longitude, store.latitude, store.longitude);
      return distance <= userModel.maxDistance;
    })
  }

  const storeNames = filteredStoreData?.map(item => item.store_name);
  const storePrices = filteredStoreData?.map(item => item.price).sort((a, b) => a - b) || [];
  const minPrice = Math.min(...storePrices) as number;
  const maxPrice = Math.max(...storePrices) as number;
  const chartMinPrice = minPrice - Math.round(minPrice * 0.1);
  const chartMaxPrice = maxPrice + Math.round(maxPrice * 0.03);
  const storeChartData: ChartData<'bar'> = {
    labels: storeNames,
    datasets: [
      {
        label: 'Pris (kr)',
        data: storePrices,
        backgroundColor: "#16a34a",
      },
    ],
  };

  const storeOptions: ChartOptions<'bar'> = {
    responsive: true,
    indexAxis: 'y',
    scales: {
      x: {
        min: chartMinPrice,
        max: chartMaxPrice,
      }
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Butikspriser',
      },
    },
  };

  function onLocationSelectACB(location: LocationResult) {
    userModel.setLocation(location.lng, location.lat);
  }

  function cartButtonOnClick() {
    if (!showQuantitySelector) {
      setShowQuantitySelector(true);
      setQuantity(1);
      addToCart(1);
    }
  }
  function handleIncreaseQuantity() {
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    addToCart(newQuantity);
  }

  function handleDecreaseQuantity() {
    if (quantity <= 1) {
      setShowQuantitySelector(false);
      setQuantity(0);
      addToCart(0);
    }
    else if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      addToCart(newQuantity);
    }
  }

  function handleQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.target.value) || 0;

    if (value <= 0) {
      setShowQuantitySelector(false);
      setQuantity(0);
      addToCart(0);
    }
    else if (value > 0) {
      setQuantity(value);
      addToCart(value);
    }
  }

  function addToCart(qty: number) {
    if (qty <= 0) {
      setShowQuantitySelector(false);
    }
    const productWithQty = {...product, qty: qty} as Product;
    userModel.addToCart(productWithQty);
    showCartToast();
  }

  return (
    <div className="details-wrapper">
        {
          product ? (
            <div className="details-container">
              <div className="head-container box-padding">
                <div className="product-img-wrapper box">
                  <img src={product.product_image_url} alt="product-image"/>
                </div>
                <div className="main-info-container">
                  <div className="main-info-box">
                    <h1>{product?.name}</h1>
                    <h3>{product?.brand}. {product?.pack_size}.</h3>
                    <p>Genomsnittspris: <span><b>~{product.avg_price.toFixed(2)}kr</b></span></p>
                    {!showQuantitySelector ? (
                      <button className="btn-primary" onClick={cartButtonOnClick}>
                        Lägg i varukorg
                      </button>
                    ) : (
                      <div className="quantity-selector">
                        <button 
                          className="qty-btn qty-minus" 
                          onClick={handleDecreaseQuantity}
                          aria-label="Minska kvantitet"
                        >
                          −
                        </button>
                        <input 
                          type="number" 
                          className="qty-input" 
                          value={quantity}
                          onChange={handleQuantityChange}
                          min="0"
                          aria-label="Kvantitet"
                        />
                        <button 
                          className="qty-btn qty-plus" 
                          onClick={handleIncreaseQuantity}
                          aria-label="Öka kvantitet"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                  {product.ingredients ?
                    <div className="clickable-section" onClick={() => setIngredientsExpanded(!ingredientsExpanded)}>
                      <h3>Ingredienser</h3>
                      {ingredientsExpanded && (
                        <p>{product.ingredients}</p>
                      )}
                    </div>
                    : ""
                  }
                  {product.product_information ?
                    <div className="clickable-section" onClick={() => setFactExpanded(!factExpanded)}>
                      <h3>Produktfakta</h3>
                      {factExpanded && (
                        <>
                          <p>{product.product_information}</p>
                          {product.country_of_origin ? <p><b>Land:</b> {product.country_of_origin}</p> : ""}
                        </>
                      )}
                    </div>
                    : ""
                  }

                </div>
              </div>

            <div className="box box-padding store-prices-box">
              <button className="btn-primary location-btn" onClick={() => setShowLocationModal(true)}>Välj område</button>
              <Bar data={storeChartData} options={storeOptions}/>
            </div>
            <div className="box box-padding">
              <Line data={generatePriceHistoryData(product?.avg_price || 0)} options={getPriceHistoryOptions(product?.avg_price || 0)}/>
            </div>
          </div>
          )
          : <div className="details-container"></div>
        }
        <LocationModal 
          isOpen={showLocationModal}
          maxDistance={userModel.maxDistance}
          onClose={() => setShowLocationModal(false)}
          onLocationSelect={onLocationSelectACB}
          onMaxDistanceSet={(distance) => userModel.setMaxDistance(distance)}
        />
    </div>
  );
});

function generatePriceHistoryData(avgPrice: number): ChartData<'line'> {
  const months = ['Jun', 'Jul', 'Aug', 'Sep', 'Okt', "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "Maj"];
  
  // Generate fake data around avg_price with some variance
  const priceData = months.map((_, index) => {
    const variance = (Math.random() - 0.5) * avgPrice * 0.2; // ±10% variance
    const trend = (index / months.length) * avgPrice * 0.1; // slight upward trend
    return Math.max(avgPrice * 0.8, avgPrice + variance + trend); // min 80% of avg_price
  });

  return {
    labels: months,
    datasets: [
      {
        label: 'Pris (kr)',
        data: priceData,
        tension: 0.1,
        backgroundColor: "rgb(84, 174, 226)",
        borderColor: "rgb(84, 174, 226)",
      },
    ],
  };
}

function getPriceHistoryOptions(avgPrice: number): ChartOptions<'line'> {
  const minPrice = avgPrice * 0.75;
  const maxPrice = avgPrice * 1.25;

  return {
    responsive: true,
    scales: {
      y: {
        min: Math.floor(minPrice),
        max: Math.ceil(maxPrice),
      }
    },
    plugins: {
      title: {
        display: true,
        text: 'Prishistorik',
      }
    }
  };
}


export { DetailsView };