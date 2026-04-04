import { useNavigate } from "react-router-dom";
import { OfferCard } from './OfferCard.tsx'
import '../search.css'
import { useProductSearch } from "../hooks/useProductSearch.ts";

export type ListProps = {
    searchTerm: string;
    searchQuery?: string;
    closeModal: () => void;
}

export function List(props: ListProps) {

    const navigate = useNavigate()

    function handleShowAll() {
        if (props.searchQuery) {
            const params = new URLSearchParams({ q: props.searchQuery })
            navigate('/search?' + params)
            props.closeModal()
        }
    }
    
    const {
        isLoading,
        error,
        data,
    } = useProductSearch(props.searchTerm)

    let content
    if (isLoading) content = <p style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>Laddar produkter...</p>
    else if (error) content = <p>{error.message}</p>
    else if (data) content =(
        <>
            <div className='search-results-header' /* style = {{margin: '8px 2px'}} */>
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

            {data.length > 8 && (
                <div className="search-all-results-bar">
                    <span className="search-all-results-link" onClick={handleShowAll}>Visa alla resultat</span>
                </div>
            )}
        </>
    )

    return content || null;
}