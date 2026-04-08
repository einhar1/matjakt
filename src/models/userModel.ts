import type { Product } from "../views/DetailsView";

export type StoreProduct = {
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
  price: number, 
  store_id: string,
  store_name: string,
  lat: number,
  lon: number,
  available: boolean, 
  distance: number, // in km  
}

export type userModelType = {
    postalCode: string;
    city: string;
    county: string;
    latitude: number;
    longitude: number;
    maxDistance: number; // in km
    usesLocation: boolean;
    cart: Product[];
    algorithmCart: StoreProduct[];
    setLocation: (longitude: number, latitude: number, postalCode?: string, city?: string, county?: string) => void;
    setMaxDistance: (distance: number) => void;
    addToCart: (product: Product) => void;
    setAlgorithmCart: (algorithmCart: StoreProduct[]) => void;
}
const exampleCart: Product[] = [
    {
        product_id: "1200101497214",
        product_key: "1200101497214",
        name: "Bärdryck Tranbär",
        brand: "Ocean Spray",
        pack_size: "1L",
        country_of_origin: "Polen",
        product_image_url: "https://res.cloudinary.com/coopsverige/image/upload/v1648047627/cloud/249991.jpg",
        product_information: "",
        ingredients: "Vatten, tranbärsjuice från koncentrat (27%), socker, C-vitamin, grönsaks- och fruktkoncentrat (morot och tranbär), naturliga aromer.",
        avg_price: 27.03857142857143
    },
    {
        product_id: "698af9f8-d425-4a5c-90bc-b4d84064e79d",
        product_key: "698af9f8-d425-4a5c-90bc-b4d84064e79d",
        name: "Grönt Pyramidte 20-p Lipton",
        brand: "Lipton",
        pack_size: "20 per frp",
        country_of_origin: "",
        product_image_url: "https://handlaprivatkund.ica.se/images-v3/bf7a00ca-390e-4769-865f-dc369586872e/4c7a013d-7f83-44d6-b7eb-d6f337e41740/500x500.jpg",
        product_information: "Information från leverantör\nLipton Green Sencha 20-pack är ett grönt te i pyramidpåsar utan kuvert från Rainforest Alliance certifierade plantage. Teet har en perfekt balans mellan rik tearom av Japansk senchate och rosenblad. Pyramidpåsen gör att de stora tebladen kommer till sin rätt. Påsens pyramidform efterliknar en tesil vilket underlättar för det heta vattnet att strömma genom påsen och ger en smakrik kopp te när du är sugen på något gott.",
        ingredients: "Ingredienser: Grönt te1, arom. 1Rainforest Alliance-certifierad",
        avg_price: 19.74748466257669
    },
    {
        product_id: "006062c6-4341-4bcf-83b9-4cf8c20d042b",
        product_key: "006062c6-4341-4bcf-83b9-4cf8c20d042b",
        name: "Juice Äpple Ananas Lime Ingefära Mynta 700ml Råsaft",
        brand: "Råsaft",
        pack_size: "0.7L",
        country_of_origin: "",
        product_image_url: "https://handlaprivatkund.ica.se/images-v3/bf7a00ca-390e-4769-865f-dc369586872e/0a445fa0-b398-4d8b-9eae-72a47a94cad5/500x500.jpg",
        product_information: "Information från leverantör\nRÅSAFT är en kallpressad juice som inte är pastöriserad. RÅSAFT pressas i Sverige av färska frukter och grönsaker. Den är rik på fibrer och vitaminer. Förvara den kallt och skaka ordentligt för bästa njutning.",
        ingredients: "89,75 % Äpple, 7,5 % Ananas, 1,5 % Lime, 1 % Ingefära, 0,05 % Mynta, 0,2 % Vitamin C (askorbinsyra)",
        avg_price: 50.87483660130719
    },
]



export const userModel = {
    postalCode: '',
    city: '',
    county: '',
    longitude: 0,
    latitude: 0,
    maxDistance: 30, // in km
    usesLocation: false,
    cart: exampleCart,
    algorithmCart: [] as StoreProduct[],

    setLocation(longitude: number, latitude: number, postalCode?: string, city?: string, county?: string) {
        if (postalCode) this.postalCode = postalCode;
        if (city) this.city = city;
        if (county) this.county = county;
        this.longitude = longitude;
        this.latitude = latitude;
        this.usesLocation = true;

        // TODO: Spara till supabase
    },
    setMaxDistance(distance: number) {
        console.log("Setting max distance to", distance);
        this.maxDistance = distance;
    },
    addToCart(product: Product) {
        console.log("Adding to cart:", product);
        this.cart.push(product);
    },
    setAlgorithmCart(algorithmCart: StoreProduct[]) {
        console.log("Setting algorithm cart to", algorithmCart);
        this.algorithmCart = algorithmCart;
    }
}

declare global {
    interface Window {
        userModel: typeof userModel;
    }
}
window.userModel = userModel;
