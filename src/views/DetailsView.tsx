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
import { useEffect, useState } from "react";
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

type Product = {
  product_id: string,
  product_key: string,
  name: string,
  brand: string,
  pack_size: string,
  country_of_origin: string,
  product_image_url: string,
  meanPrice: string,
}

export type DetailsViewProps = {
  userModel: userModelType,
}

function DetailsView(props: DetailsViewProps) {
  const { productId } = useParams<{ productId: string}>();
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [factExpanded, setFactExpanded] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const userModel = props.userModel;

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      // 1. fetch product

      for (const db of [supabase, coopSupabase]) {
        
        const { data: product, error: productError } = await db
          .from("products")
          .select("product_id, product_key, name, brand, pack_size, country_of_origin, product_image_url, product_information, ingredients")
          .eq("product_id", productId)
          .single();

        if (productError) {
          console.log(productError);
          continue;
        }

        if (!!product.product_image_url) {
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

        // 3. compute mean
        const validPrices = storeData.filter(
          s => s.available && s.price != null
        );

        const meanPrice =
          validPrices.length > 0
            ? (
                validPrices.reduce((sum, p) => sum + p.price, 0) /
                validPrices.length
              ).toFixed(2)
            : "0.00";
        
        const priceAndStoreData = [];
        for (const item of storeData) {
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
          product: {...product, meanPrice},
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
  const storePrices = filteredStoreData?.map(item => item.price) as any[];
  const minPrice = Math.min(...storePrices) as number;
  const maxPrice = Math.max(...storePrices) as number;
  const chartMinPrice = minPrice - Math.round(minPrice * 0.03);
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
  

  return (
    <div className="details-wrapper">
        {
          !!product ? (
            <div className="details-container">
              <div className="head-container box-padding">
                <div className="product-img-wrapper box">
                  <img src={product.product_image_url} alt="product-image"/>
                </div>
                <div className="main-info-container">
                  <div className="main-info-box">
                    <h1>{product?.name}</h1>
                    <h3>{product?.brand}. {product?.pack_size}.</h3>
                    <p>Genomsnittspris: <span><b>{product.meanPrice}kr</b></span></p>
                    <button>Lägg i varukorg</button>
                  </div>
                  {!!product.ingredients ?
                    <div className="clickable-section" onClick={() => setIngredientsExpanded(!ingredientsExpanded)}>
                      <h3>Ingredienser</h3>
                      {ingredientsExpanded && (
                        <p>{product.ingredients}</p>
                      )}
                    </div>
                    : ""
                  }
                  {!!product.product_information ?
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
              <button className="location-btn" onClick={() => setShowLocationModal(true)}>Välj område</button>
              <Bar data={storeChartData} options={storeOptions}/>
            </div>
            <div className="box box-padding">
              <Line data={priceHistoryData} options={priceHistoryOptions}/>
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
}

const priceHistoryData: ChartData<'line'> = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"],
  datasets: [
    {
      label: 'Pris (kr)',
      data: [40, 40, 42, 42, 43, 42, 42, 45, 45, 45, 48, 48, 45],
      tension: 0.1, // smooth curve
      backgroundColor: "rgb(84, 174, 226)",
      borderColor: "rgb(84, 174, 226)",
    },
  ],
};

const priceHistoryOptions: ChartOptions<'line'> = {
  responsive: true,
  scales: {
    y: {
      min: 40,
      max: 50,
    }
  },
  plugins: {
    title: {
      display: true,
      text: 'Prishistorik',
    }
  }
};


export { DetailsView };