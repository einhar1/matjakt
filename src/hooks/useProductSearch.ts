import useSWRInfinite from 'swr/infinite'
import { supabase } from '../utils/supabase';
import { type OfferItem } from '../components/OfferCard.tsx'
import { userModel } from '../models/userModel.ts';
import type { CurrentPrice, Product, Store } from '../types/database.ts';

/* Built using weighted vectors, inspired by:
https://dev.to/reclusivecoder/skip-elasticsearch-build-blazing-fast-full-text-search-right-in-supabase-58pf 

Get search function in SQL:

SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'search_products_dev1_1';

*/

type SearchResultRow = {
    product: Product;
    store: Store;
    current_price: CurrentPrice;
    relevance: number;
}

export const PAGE_SIZE = 15

async function fetchProducts([_key, term, pageIndex, [userLat, userLon], maxDistance]: [string, string, number, [number, number], number]): Promise<OfferItem[]> {
    
    const sanitized = term.trim().substring(0,100);

    if (!sanitized) return [];

    console.log(`fetching products from search... Page Index: ${pageIndex}`)

    const { data: results, error: searchError } = await supabase
        .rpc("search_products_dev1_2", {
            search_term: sanitized,
            result_limit: PAGE_SIZE,
            result_offset: pageIndex * PAGE_SIZE,
            user_lat: userLat || null,
            user_lon: userLon || null,
            max_distance: maxDistance
        })

    if (searchError) {
        throw new Error(searchError.message)
    }

    if (!results?.length) return []
    
    // TODO: type any
    return results
        .map((row: SearchResultRow) => {
            return {
                product: {
                    ...row.product,
                    product_image_url: row.product.product_image_url?.replace(".tiff", ".jpg") // The web can't display TIFFs, so we replace the extension
                },
                store: row.store,
                currentPrice: row.current_price
            }
        })
    }

const SWRConfig = {
    revalidateOnFocus: false,  // don't revalidate when window gets focused
    dedupingInterval: 120000,  // 120s until new results instead of cache
    revalidateFirstPage: false // stops Page 0 from refetching on every scroll
}

export function useProductSearch(searchTerm: string) {

    const [userLat, userLon] = userModel.getLocation() || [null, null];
    const maxDistance = userModel.getMaxDistance()*1000;

    // TODO: type any
    const getKey = (pageIndex: number, previousPageData: any) => {
        if ((previousPageData && !previousPageData.length) || !searchTerm)  {
            return null  // reached the end
        }
        return ['products', searchTerm, pageIndex, [userLat, userLon], maxDistance]
    }

    const { data, error, size, setSize, isValidating } = useSWRInfinite<OfferItem[], Error>(
        getKey,
        fetchProducts,
        SWRConfig
    )
    
    const products = data ? data.flat() : []
    const isLoadingInitial = !data && !error
    // isLoadingMore is true when we just incremented the size, but the new page hasn't arrived
    const isLoadingMore = size > 0 && data && typeof data[size - 1] === 'undefined'
    const isFetching = isLoadingInitial || isLoadingMore || isValidating
    const hasMore = data ? data[data.length - 1]?.length > 0 : false;

    
    return {
        data: products,
        error,
        isLoading: isLoadingInitial,
        isFetching,
        hasMore,
        setSize,
        size
    }
}