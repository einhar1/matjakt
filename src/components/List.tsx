import { useNavigate } from "react-router-dom";
import { OfferCard, type OfferItem } from './OfferCard.tsx'
import '../search.css'
import { useProductSearch, PAGE_SIZE } from "../hooks/useProductSearch.ts";
import { userModel } from "../models/userModel.ts";

export type ListProps = {
    searchTerm: string;
    searchQuery?: string;
    closeModal: () => void;
    onAddToCart?: (offer: OfferItem) => void;
}

export function List({ searchTerm, searchQuery, closeModal, onAddToCart }: ListProps) {

    const navigate = useNavigate()

    function handleShowAll() {
        if (searchQuery) {
            closeModal()
            const params = new URLSearchParams({ q: searchQuery })
            navigate('/search?' + params)
        }
    }

    const {
        isLoading,
        error,
        data,
    } = useProductSearch(searchTerm)

    const cartQtyMap = new Map(userModel.cart.map(item => [item.product_key, item.qty]));


    // Force 9 items regardless of what SWR has in cache
    const displayData = data ? data.slice(0, 9) : []

    let content
    if (isLoading) content = <p style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>Laddar produkter...</p>
    else if (error) content = <p>{error.message}</p>
    else if (data) content =(
        <>
            <div className='search-results-header' /* style = {{margin: '8px 2px'}} */>
                Produkter <span>• visar {data.length === PAGE_SIZE ? data.length+'+': data.length} träffar</span>
            </div>

            <div className='search-results-grid modal'>
                {displayData.map((offer, index) => (
                    <div key={`search-${offer.currentPrice.product_key}-${index}`} onClick={closeModal}>
                        <OfferCard
                            offer={offer}
                            onAddToCart={onAddToCart}
                            use_avg={true}
                            initialQuantity={cartQtyMap.get(offer.product.product_key) || 0}
                        />
                    </div>
                ))}
            </div>

            {data.length > 0 && (
                <div className="search-all-results-bar">
                    <span className="search-all-results-link" onClick={handleShowAll}>Visa alla resultat</span>
                </div>
            )}
        </>
    )

    return content || null;
}