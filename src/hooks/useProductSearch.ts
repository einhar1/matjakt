import useSWR from 'swr' 
import { supabase } from '../utils/supabase';
import { type OfferItem } from '../components/OfferCard.tsx'

export type ListProps = {
    searchTerm: string;
    searchQuery?: string;
}

/* Built using weighted vectors, inspired by:
https://dev.to/reclusivecoder/skip-elasticsearch-build-blazing-fast-full-text-search-right-in-supabase-58pf */

async function fetchProducts([_key, term]: [string, string]): Promise<OfferItem[]> {
    
    const sanitized = term.trim().substring(0,100);

    if (!sanitized || sanitized === '') return [];

    const { data: products, error: searchError } = await supabase
        .rpc("search_products", {
            search_term: sanitized,
            result_limit: 9,
            result_offset: 0,
        })

    if (searchError) {
        throw new Error(searchError.message)
    }
    if (!products?.length) return []

    const productKeys = products.map((p: any) => p.product_key)

    console.log('fetching products from search...')

    const { data: prices, error: priceError } = await supabase
        .from('current_prices')
        .select(`
            *,
            stores (*)
        `)
        .in('product_key', productKeys)
        .order('price', { ascending: true })

        if (priceError) throw new Error(priceError.message);

        // Billigaste pris per produkt
        const bestPrice = new Map<string, any>();
            prices?.forEach((p: any) => {
                if (!bestPrice.has(p.product_key)) {
                bestPrice.set(p.product_key, p);
                }
        });
        
    return products
        .filter((product: any) => bestPrice.has(product.product_key))
        .map((product: any) => {
            const price = bestPrice.get(product.product_key)!;
            return {
                product,
                currentPrice: price,
                store: price.stores
            }
        })
    }

export function useProductSearch(searchTerm: string) {
    
    const SWRConfig = {
        revalidateOnFocus: false,  // don't revalidate when window gets focused
        dedupingInterval: 120000  // 120s until new results instead of cache
    }

    return useSWR<OfferItem[], Error>(
        searchTerm ? ['products', searchTerm] : null,
        fetchProducts,
        SWRConfig
    )
}