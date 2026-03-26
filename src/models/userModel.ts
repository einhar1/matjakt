
export const userModel = {
    postalCode: '',
    city: '',
    county: '',

    setLocation(postalCode: string, city: string, county: string) {
        this.postalCode = postalCode;
        this.city = city;
        this.county = county;
        // TODO: Spara till supabase
    }
}