import '../style.css'
import '../search.css'
import { OfferCard } from '../components/OfferCard.tsx';
import { useProductSearch } from '../hooks/useProductSearch.ts'
import { useSearchParams } from 'react-router-dom';

function SearchView() {
    const [searchParams] = useSearchParams()
    const queryFromUrl = searchParams.get('q') || ''
    const { data, isLoading, error } = useProductSearch(queryFromUrl)

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
        </>
    )

    return (
    <div className="search-wrapper">
        {content}
    </div>
    )
}

export { SearchView };
