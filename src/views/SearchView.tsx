import '../style.css'
import '../search.css'
import { useCallback } from 'react';
import { OfferCard } from '../components/OfferCard.tsx';
import { ScrollObserver } from "../components/ScrollObserver.tsx";
import { useProductSearch } from '../hooks/useProductSearch.ts'
import { useSearchParams } from 'react-router-dom';

const LoadingSpinner = () => (
    <p style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>
        Laddar produkter...
    </p>
)

function SearchView() {

    const [searchParams] = useSearchParams()
    const queryFromUrl = searchParams.get('q') || ''
    const {
        data: products,
        error,
        isLoading,
        isFetching,
        hasMore,
        setSize,
    } = useProductSearch(queryFromUrl)

    // Memoizes this function so ScrollObserver's useEffect doesn't "thrash"
    const onLoadMoreACB = useCallback(() => {
            setSize(prevSize => prevSize + 1)
    }, [setSize]);

    let content
    if (isLoading) content = <LoadingSpinner />
    else if (error) content = <p>{error.message}</p>
    else if (products && products.length > 0) content = (
        <>
            <div className='search-results-header'>
                Produkter <span>• visar {products.length} träffar</span>
            </div>

            <div className='search-results-grid search-view'>
                {products.map((offer, index) => (
                    <OfferCard
                        key={`search-${offer.currentPrice.store_id}-${offer.currentPrice.product_key}-${index}`}
                        offer={offer}
                    />
                ))}
            </div>

            {isFetching && !isLoading && <LoadingSpinner />}

            {hasMore && (
                <ScrollObserver
                    loading={isFetching} 
                    onLoadMore={onLoadMoreACB}
                />
            )}
            
            
        </>
    )

    else if (products && products.length === 0) {
        content = <p>Inga produkter hittades för "{queryFromUrl}"</p>
    }

    return (
    <div className="search-wrapper">
        {content}
    </div>
    )
}

export { SearchView };
