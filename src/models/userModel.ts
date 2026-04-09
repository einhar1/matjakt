import type { Product } from "../views/DetailsView";
import { supabase } from "../utils/supabase";

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
    userId: string | null;
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
    removeFromCart: (productId: string) => void;
    setAlgorithmCart: (algorithmCart: StoreProduct[]) => void;
    getLocation?: () => [number, number];
    getMaxDistance?: () => number;
    // Supabase persistence
    saveToSupabase: () => void;
    loadFromSupabase: (userId: string) => Promise<boolean>;
}

export const userModel: userModelType = {
    userId: null, // set when user logs in, null when logged out
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
        this.saveToSupabase();
    },
    setMaxDistance(distance: number) {
        this.maxDistance = distance;
        this.saveToSupabase();
    },
    addToCart(product: Product) {
        this.cart.push(product);
        this.saveToSupabase();
    },
    removeFromCart(productId: string) {
        this.cart = this.cart.filter(p => p.product_id !== productId);
        this.saveToSupabase();
    },
    setAlgorithmCart(algorithmCart: StoreProduct[]) {
        console.log("Setting algorithm cart to", algorithmCart);
        this.algorithmCart = algorithmCart;
    },
    getLocation(){
        if (this.usesLocation) {
            return [this.latitude, this.longitude]
        }
        return undefined
    },
    getMaxDistance() {
        return this.maxDistance;
    },
    // Persist current local state to the user's profile row in Supabase
    // Only runs if the user is logged in (userId is set)
    saveToSupabase() {
        if (!this.userId) return;

        supabase
            .from("profiles")
            .update({
                postal_code: this.postalCode,
                city: this.city,
                county: this.county,
                latitude: this.latitude,
                longitude: this.longitude,
                max_distance: this.maxDistance,
                uses_location: this.usesLocation,
                cart: this.cart,
            })
            .eq("id", this.userId)
            .then(({ error }) => {
                if (error) console.error("Failed to save profile:", error.message);
            });
    },

    // Load the user's profile from Supabase and hydrate local fields
    // Returns true if the profile had saved data (uses_location or non-empty cart)
    async loadFromSupabase(userId: string) {
        const { data, error } = await supabase
            .from("profiles")
            .select("postal_code, city, county, latitude, longitude, max_distance, uses_location, cart")
            .eq("id", userId)
            .single();

        if (error || !data) {
            console.error("Failed to load profile:", error?.message);
            return false;
        }

        // Check if the profile has any saved data worth loading
        const hasData = data.uses_location || (data.cart && data.cart.length > 0);

        if (hasData) {
            this.postalCode = data.postal_code ?? '';
            this.city = data.city ?? '';
            this.county = data.county ?? '';
            this.latitude = data.latitude ?? 0;
            this.longitude = data.longitude ?? 0;
            this.maxDistance = data.max_distance ?? 10;
            this.usesLocation = data.uses_location ?? false;
            this.cart = data.cart ?? [];
        }

        return hasData;
    },
}

declare global {
    interface Window {
        userModel: typeof userModel;
    }
}
window.userModel = userModel;
