import type { Product } from "../views/DetailsView";

export type userModelType = {
    postalCode: string;
    city: string;
    county: string;
    latitude: number;
    longitude: number;
    maxDistance: number; // in km
    usesLocation: boolean;
    cart: Product[];
    setLocation: (longitude: number, latitude: number, postalCode?: string, city?: string, county?: string) => void;
    setMaxDistance: (distance: number) => void;
    addToCart: (product: Product) => void;
}

export const userModel = {
    postalCode: '',
    city: '',
    county: '',
    longitude: 0,
    latitude: 0,
    maxDistance: 30, // in km
    usesLocation: false,
    cart: [] as Product[],

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
    }
}