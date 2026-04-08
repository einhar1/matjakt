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
    getLocation?: () => [number, number];
    getMaxDistance?: () => number;
}



export const userModel = {
    postalCode: '',
    city: '',
    county: '',
    longitude: 0,
    latitude: 0,
    maxDistance: 10, // in km
    usesLocation: false,
    cart: [] as Product[],
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
    },
    getLocation(){
        console.log('user: ', this.latitude, this.longitude)
        if (this.usesLocation) {
            return [this.latitude, this.longitude]
        }
        return undefined
    },
    getMaxDistance() {
        return this.maxDistance;
    },
}

declare global {
    interface Window {
        userModel: typeof userModel;
    }
}
window.userModel = userModel;
