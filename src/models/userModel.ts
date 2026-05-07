import { makeAutoObservable, runInAction } from 'mobx';
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
  qty: number,
  price: number,
  store_id: string,
  store_name: string,
  lat: number,
  lon: number,
  available: boolean,
  distance: number, // in km
}

class UserModel {
    userId: string | null = null;
    postalCode: string = '';
    city: string = '';
    county: string = '';
    longitude: number = 0;
    latitude: number = 0;
    maxDistance: number = 10; // in km
    usesLocation: boolean = false;
    hasSeniorDiscount: boolean = false;
    seniorDiscountPercent: number = 0;
    cart: Product[] = [];
    algorithmCart: StoreProduct[] = [];

    get cartItemCount() {
        return this.cart.reduce((total, item) => total + (item.qty ?? 1), 0);
    }

    constructor() {
        makeAutoObservable(this);
    }

    setLocation(longitude: number, latitude: number, postalCode?: string, city?: string, county?: string) {
        if (postalCode) this.postalCode = postalCode;
        if (city) this.city = city;
        if (county) this.county = county;
        this.longitude = longitude;
        this.latitude = latitude;
        this.usesLocation = true;
        this.saveToSupabase();
    }

    setMaxDistance(distance: number) {
        this.maxDistance = distance;
        this.saveToSupabase();
    }

    setHasSeniorDiscount(has: boolean) {
        this.hasSeniorDiscount = has;
        if (!has) this.seniorDiscountPercent = 0;
        this.saveToSupabase();
    }

    setSeniorDiscountPercent(percent: number) {
        const clamped = Math.max(0, Math.min(100, percent));
        this.seniorDiscountPercent = clamped;
        this.saveToSupabase();
    }

    addToCart(product: Product) {
        const sameProduct = this.cart.find(p => p.product_id === product.product_id);
        if (sameProduct) {
            if ((product.qty ?? 0) <= 0) {
                this.cart = this.cart.filter(p => p.product_id !== product.product_id);
                this.saveToSupabase();
                return;
            }
            this.cart = this.cart.map(p => p.product_id === product.product_id ? { ...p, qty: (product.qty || 1) } : p);
        } else {
            this.cart.push(product);
        }
        this.saveToSupabase();
    }

    removeFromCart(productId: string) {
        this.cart = this.cart.filter(p => p.product_id !== productId);
        this.saveToSupabase();
    }

    clearCart() {
        this.cart = [];
        this.saveToSupabase();
    }

    setAlgorithmCart(algorithmCart: StoreProduct[]) {
        console.log("Setting algorithm cart to", algorithmCart);
        this.algorithmCart = algorithmCart;
    }

    getLocation(): [number, number] {
        return [this.latitude, this.longitude];
    }

    getCity(): string {
        return this.city;
    }

    getPostalCode(): string {
        return this.postalCode;
    }

    getMaxDistance() {
        return this.maxDistance;
    }

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
                has_senior_discount: this.hasSeniorDiscount,
                senior_discount_percent: this.seniorDiscountPercent,
                cart: this.cart,
            })
            .eq("id", this.userId)
            .then(({ error }) => {
                if (error) console.error("Failed to save profile:", error.message);
            });
    }

    async loadFromSupabase(userId: string) {
        const { data, error } = await supabase
            .from("profiles")
            .select("postal_code, city, county, latitude, longitude, max_distance, uses_location, has_senior_discount, senior_discount_percent, cart")
            .eq("id", userId)
            .single();

        if (error || !data) {
            console.error("Failed to load profile:", error?.message);
            return false;
        }

        const hasData = data.uses_location || (data.cart && data.cart.length > 0);

        runInAction(() => {
            if (hasData) {
                this.postalCode = data.postal_code ?? '';
                this.city = data.city ?? '';
                this.county = data.county ?? '';
                this.latitude = data.latitude ?? 0;
                this.longitude = data.longitude ?? 0;
                this.maxDistance = data.max_distance ?? 10;
                this.usesLocation = data.uses_location ?? false;
                this.hasSeniorDiscount = data.has_senior_discount ?? false;
                this.seniorDiscountPercent = data.senior_discount_percent ?? 0;
                this.cart = data.cart ?? [];
            }
        });

        return hasData;
    }
}

export const userModel = new UserModel();
export type userModelType = typeof userModel;

declare global {
    interface Window {
        userModel: typeof userModel;
    }
}
window.userModel = userModel;
