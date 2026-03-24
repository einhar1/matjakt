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

type Product = {
  product_id: string,
  product_key: string,
  name: string,
  brand: string,
  pack_size: string,
  country_of_origin: string,
  meanPrice: string,
}

export type DetailsViewProps = {

}

function DetailsView(props: DetailsViewProps) {
  const { productId } = useParams<{ productId: string}>();
  const [product, setProduct] = useState<Product | null>(null);


  useEffect(() => {
    async function fetchData() {
      const productResponse = await supabase
        .from("products")
        .select("product_id, product_key, name, brand, pack_size, country_of_origin")
        .eq("product_id", productId)
        .single();
      

      if (productResponse.error) {
        console.error(productResponse.error)
        setProduct(null);
      } else {

        const storeResponse = await supabase
          .from("current_prices")
          .select("store_id, product_key, price, unit_price, currency, available")
          .eq("product_key", productResponse.data.product_key);
        
        if (storeResponse.error) {
          console.log(storeResponse.error);
        }
        else {

          let sumPrices = 0;
          storeResponse.data.forEach(storeData => {
            if (storeData.available && !!storeData.price && storeData.product_key === productResponse.data.product_key) {
              sumPrices += storeData.price;
            }
          });
          
          const meanPrice = (sumPrices / storeResponse.data.length).toFixed(2);

          const newProduct: Product = {
            product_id: productResponse.data.product_id,
            product_key: productResponse.data.product_key,
            name: productResponse.data.name,
            brand: productResponse.data.brand,
            pack_size: productResponse.data.pack_size,
            country_of_origin: productResponse.data.country_of_origin,
            meanPrice: meanPrice,
          }

          setProduct(newProduct);
          console.log("FINISHED");
        }
      }
    }

    fetchData()
  }, [productId]);


  return (
    <div className="details-wrapper">
        {
          !!product ? (
            <div className="details-container">
              <div className="head-container box-padding">
                <img className="box" src="src/assets/gevalia.webp" alt="gevalia"/>
                <div className="main-info-container">
                  <div className="main-info-box box">
                    <h1>{product?.name}</h1>
                    <h3>{product?.brand}. {product?.pack_size}.</h3>
                    <p>Genomsnittspris: <span><b>{product.meanPrice}kr</b></span></p>
                    <button>Lägg i varukorg</button>
                  </div>
                  <div className="box">
                    <h3>Ingredienser</h3>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Corporis, 
                      et nihil officia cupiditate voluptas esse blanditiis magni molestias non quo
                    </p>
                  </div>
                  <div className="box">
                    <h3>Produktfakta</h3>
                    <p><b>Land:</b> {product.country_of_origin}</p>
                    <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Corporis, 
                      et nihil officia cupiditate voluptas esse blanditiis magni molestias non quo
                      lorem
                    </p>
                  </div>
                </div>
              </div>

            <div className="box box-padding">
              <button>Butiker nära dig</button>
              <Bar data={storeData} options={storeOptions}/>
            </div>
            <div className="box box-padding">
              <Line data={priceHistoryData} options={priceHistoryOptions}/>
            </div>
          </div>
          )
          : <div className="details-container"></div>
        }
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
      backgroundColor: "rgb(228, 64, 64)",
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