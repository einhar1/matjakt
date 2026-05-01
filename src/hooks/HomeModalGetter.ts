

import useSWRInfinite from 'swr/infinite'
import { supabase } from '../utils/supabase.ts';
import { type OfferItem } from '../components/OfferCard.tsx'
import { userModel } from '../models/userModel.ts';
import type { CurrentPrice, Product, Store } from '../types/database.ts';

/* 
Get function in SQL:

SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'get_best_local_deals';

*/

type DealsResultRow = {
    product: Product;
    store: Store;
    price: CurrentPrice;
    relevance: number;
}

export const PAGE_SIZE = 30

async function fetchProducts([_key, pageIndex, userLat, userLon, maxDistance]: [string, number, number, number, number]): Promise<OfferItem[]> {

    console.log(`fetching products from avg_price... Page Index: ${pageIndex}`)

    const { data: results, error: fetchError } = await supabase
        .rpc("get_best_local_deals", {
            result_limit: PAGE_SIZE,
            result_offset: pageIndex * PAGE_SIZE,
            user_lat: userLat || null,
            user_lon: userLon || null,
            max_distance: maxDistance
        })

    if (fetchError) {
        throw new Error(fetchError.message)
    }

    if (!results?.length) return []
    
    // TODO: type any
    return results
        .map((row: DealsResultRow) => {
            return {
                product: {
                    ...row.product,
                    product_image_url: row.product.product_image_url?.replace(".tiff", ".jpg")
                },
                store: row.store,
                currentPrice: row.price
            }
        })
}

const SWRConfig = {
    revalidateOnFocus: false,  // don't revalidate when window gets focused
    dedupingInterval: 120000,  // 120s until new results instead of cache
    revalidateFirstPage: false // stops Page 0 from refetching on every scroll
}

export function useBestLocalDeals() {
    // Defaults to central stockholm
    const [userLat, userLon] = userModel.usesLocation? userModel.getLocation() || [null, null] : [59.3265836,18.0715665];
    const maxDistance = userModel.usesLocation? userModel.getMaxDistance()*1000 : 5000;

    // TODO: type any
    const getKey = (pageIndex: number, previousPageData: any) => {
        if ((previousPageData && !previousPageData.length))  {
            return null  // reached the end
        }
        return ['products', pageIndex, userLat, userLon, maxDistance]
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