import useSWR from 'swr' 
import { supabase } from '../utils/supabase';
import { OfferCard, type OfferItem } from './OfferCard.tsx'
import '../search.css'

export type ListProps = {
    searchTerm: string;
}

async function fetchProducts([_key, term]: [string, string]): Promise<OfferItem[]> {
    const { data, error } = await supabase
        .from("products")
        .select(`
            *,
            current_prices (
                *,
                stores (*)
            )
        `)
        .textSearch("name", term, { 
            type: 'websearch',
            config: 'swedish'
        })
        .limit(10)

    if (error) {
        throw new Error(error.message);
    }

    const validOffers: OfferItem[] = [];

    data?.forEach(product => {
        if (product.current_prices && product.current_prices.length > 0) {
            const priceData = product.current_prices[0];

            validOffers.push({
                product: product,
                currentPrice: priceData,
                store: priceData.stores
            })
        }
    })

    return validOffers;
}

export function List(props: ListProps) {
    const {
        isLoading,
        error,
        data,
    } = useSWR<OfferItem[], Error>(
        props.searchTerm ? ['products', props.searchTerm] : null,
        fetchProducts
    );

    let content
    if (isLoading) content = <p style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>Laddar produkter...</p>
    else if (error) content = <p>{error.message}</p>
    else if (data) content =(
        <>
            <div className='search-results-header'>
                Produkter <span>• visar {data.length} träffar</span>
            </div>
            
            <div className='search-results-grid'>
                {data.map((offer, index) => (
                    <OfferCard
                        key={`search-${offer.currentPrice.store_id}-${offer.currentPrice.product_key}-${index}`}
                        offer={offer}
                    />
                ))}
            </div>

            {data.length > 0 && (
                <div className="search-all-results-bar">
                    <span className="search-all-results-link">Visa alla resultat</span>
                </div>
            )}
        </>
    )

    return content || null;
}