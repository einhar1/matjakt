
import postalData from '../data/postalcodes.json';

type JsonLocation = {
    city: string;
    municipality: string;
    county: string;
}

type PostalDataDict = {
    [key: string]: JsonLocation[];
}

export type PostalCodeEntry = {
    postalCode: string;
    city: string;
    municipality: string;
    county: string;
}

export const postalCodeModel = {
    lookup(code: string): PostalCodeEntry[] {
        const dict = postalData as PostalDataDict;
        const matches = dict[code];

        if (!matches) return [];

        return matches.map(entry => ({
            postalCode: code,
            city: entry.city,
            municipality: entry.municipality,
            county: entry.county
        }));
    }
};