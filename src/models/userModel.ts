
export type userModelType = {
    postalCode: string;
    city: string;
    county: string;
    setLocation: (longitude: number, latitude: number, postalCode?: string, city?: string, county?: string) => void;
}

export const userModel = {
    postalCode: '',
    city: '',
    county: '',
    longitude: 0,
    latitude: 0,

    setLocation(longitude: number, latitude: number, postalCode?: string, city?: string, county?: string) {
        if (postalCode) this.postalCode = postalCode;
        if (city) this.city = city;
        if (county) this.county = county;
        this.longitude = longitude;
        this.latitude = latitude;
        // TODO: Spara till supabase
    }
}