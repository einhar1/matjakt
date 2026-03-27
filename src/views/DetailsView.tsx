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
import { supabase } from "../utils/supabase";
import { useParams } from "react-router-dom";
import { LocationModal } from "../components/LocationModal";
import { useQuery } from "@tanstack/react-query";

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

}

function DetailsView(props: DetailsViewProps) {
  const { productId } = useParams<{ productId: string}>();
  const [ingredientsExpanded, setIngredientsExpanded] = useState(false);
  const [factExpanded, setFactExpanded] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, name: string} | null>(null);


  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      // 1. fetch product
      const { data: product, error: productError } = await supabase
        .from("products")
        .select("product_id, product_key, name, brand, pack_size, country_of_origin, product_image_url, product_information, ingredients")
        .eq("product_id", productId)
        .single();

      if (productError) throw productError;

      const { data: prices, error: priceError } = await supabase
        .from("current_prices")
        .select("store_id, product_key, price, unit_price, currency, available")
        .eq("product_key", product.product_key);    
      
      if (priceError) throw priceError;
      
      // 3. compute mean
      const validPrices = prices.filter(
        p => p.available && p.price != null
      );

      const meanPrice =
        validPrices.length > 0
          ? (
              validPrices.reduce((sum, p) => sum + p.price, 0) /
              validPrices.length
            ).toFixed(2)
          : "0.00";

      return {
        ...product,
        meanPrice,
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

  const product = productQuery.data;

  return (
    <div className="details-wrapper">
        {
          !!product ? (
            <div className="details-container">
              <div className="head-container box-padding">
                <img className="box" src={product.product_image_url} alt="product-image"/>
                <div className="main-info-container">
                  <div className="main-info-box">
                    <h1>{product?.name}</h1>
                    <h3>{product?.brand}. {product?.pack_size}.</h3>
                    <p>Genomsnittspris: <span><b>{product.meanPrice}kr</b></span></p>
                    <button>Lägg i varukorg</button>
                  </div>
                  <div className="clickable-section" onClick={() => setIngredientsExpanded(!ingredientsExpanded)}>
                    <h3>Ingredienser</h3>
                    {ingredientsExpanded && (
                      <p>{product.ingredients}</p>
                    )}
                  </div>
                  <div className="clickable-section" onClick={() => setFactExpanded(!factExpanded)}>
                    <h3>Produktfakta</h3>
                    {factExpanded && (
                      <>
                        <p>{product.product_information}</p>
                        {product.country_of_origin ? <p><b>Land:</b> {product.country_of_origin}</p> : ""}
                      </>
                    )}
                  </div>
                </div>
              </div>

            <div className="box box-padding store-prices-box">
              <button className="location-btn" onClick={() => setShowLocationModal(true)}>Välj område</button>
              <Bar data={storeData} options={storeOptions}/>
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
          onClose={() => setShowLocationModal(false)}
          onLocationSelect={(location) => {
            setSelectedLocation(location);
            console.log('Selected location:', location);
            // Here you can add logic to update the store prices based on the selected location
          }}
        />
    </div>
  );
}


const storeData: ChartData<'bar'> = {
  labels: [
    'ICA Nära Stabby', 'ICA Kvantum Jätten', 'ICA Supermarket Fyren', 'ICA Supermarket Höör', 
    'ICA Kvantum Stenungsund', 'ICA Supermarket Skåre', 'ICA Kvantum Farsta', 'ICA Kvantum Knivsta',
    'ICA Kvantum Liljeholmen', 'Maxi ICA Stormarknad Mora'
  ],
  datasets: [
    {
      label: 'Pris (kr)',
      data: [55, 57, 60, 60, 60, 60, 65, 65, 80, 80],
      backgroundColor: "#16a34a",
    },
  ],
};

const storeOptions: ChartOptions<'bar'> = {
  responsive: true,
  indexAxis: 'y',
  scales: {
    x: {
      min: 50,
      max: 100,
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