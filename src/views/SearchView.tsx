import '../style.css'
import '../search.css'
import { useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { OfferCard, offerItemToCartProduct, type OfferItem } from '../components/OfferCard.tsx';
import { ScrollObserver } from "../components/ScrollObserver.tsx";
import { useProductSearch } from '../hooks/useProductSearch.ts'
import { useSearchParams } from 'react-router-dom';
import type { userModelType } from '../models/userModel';
import { useToast } from '../context/ToastContext';
import { Modal } from '../components/Modal.tsx';
import { mockOffers } from '../mockdata.ts';
import type { StoreFilter } from '../components/StoreFilterDropdown';
import { SortDropdown, type SortBy } from '../components/SortDropdown';

const LoadingSpinner = () => (
    <p style={{display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px'}}>
        Laddar produkter...
    </p>
)

type SearchViewProps = {
    userModel: userModelType;
}

const SearchView = observer(function SearchView({ userModel }: SearchViewProps) {
    const { showCartToast } = useToast();
    const [showCardHelpModal, setShowCardHelpModal] = useState(false);

    const [searchParams, setSearchParams] = useSearchParams()
    const queryFromUrl = searchParams.get('q') || ''
    const storeFromUrl = (searchParams.get('store') || 'all') as StoreFilter
    const sortFromUrl = (searchParams.get('sort') || 'relevance') as SortBy
    const {
        data: products,
        error,
        isLoading,
        isFetching,
        hasMore,
        setSize,
    } = useProductSearch(queryFromUrl, storeFromUrl, sortFromUrl)

    function handleSortChange(next: SortBy) {
        const params = new URLSearchParams(searchParams)
        if (next === 'relevance') params.delete('sort')
        else params.set('sort', next)
        setSearchParams(params, { replace: true })
    }
    const cartQtyMap = new Map(userModel.cart.map(item => [item.product_key, item.qty]));

    function showHelpModal() {
        setShowCardHelpModal(true);
    }
    function closeCardHelpModal() {
        setShowCardHelpModal(false)
    }

    // Memoizes this function so ScrollObserver's useEffect doesn't "thrash"
    const onLoadMoreACB = useCallback(() => {
            setSize(prevSize => prevSize + 1)
    }, [setSize]);

    function onAddToCartACB(offer: OfferItem) {
        userModel.addToCart(offerItemToCartProduct(offer));
        showCartToast();
    }
    
    let content
    if (isLoading) content = <LoadingSpinner />
    else if (error) content = <p>{error.message}</p>
    else if (products && products.length > 0) content = (
        <>
            <div className='search-results-header'>
                Produkter <span>• visar {products.length} träffar •</span>
                <span className='help-badge' onClick={showHelpModal}>?</span>
                <SortDropdown value={sortFromUrl} onChange={handleSortChange} className="search-header-sort" />
            </div>

            <div className='search-results-grid search-view'>
                {products.map((offer, index) => (
                    <OfferCard
                        key={`search-${offer.currentPrice.product_key}-${index}`}
                        offer={offer}
                        onAddToCart={onAddToCartACB}
                        use_avg={true}
                        initialQuantity={cartQtyMap.get(offer.product.product_key) || 0}
                        priceClick={showHelpModal}
                    />
                ))}
            </div>

            {isFetching && !isLoading && <LoadingSpinner />}

            <Modal
            isOpen={showCardHelpModal}
            onClose={closeCardHelpModal}
            >
            <>
                <div className="modal-top-bar">
                <button className='modal-back-btn' onClick={closeCardHelpModal}>
                    ← Tillbaka
                </button>
                <div className='modal-header'>
                    <h2>Så läser du kortet</h2>
                </div>
                </div>
    
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0 10px' }}>
                <div className='offer-card' style={{ maxWidth: '260px', pointerEvents: 'none', transform: 'scale(0.95)' }}>
                    <div className={`offer-image${mockOffers[0].product.product_image_url? '' : ' no-image'}`}>
                    {mockOffers[0].product.product_image_url && (
                        <img src={mockOffers[0].product.product_image_url} alt="Demo produkt"/>
                    )}
                    </div>
                    <div className='offer-content'>
                    <h3>{mockOffers[0].product.name}</h3>
                    {mockOffers[0].product.brand && (
                        <p className='offer-brand'>{mockOffers[0].product.brand}</p>
                    )}
                    <div className='offer-prices'>
                        <div className='offer-price-row'>
                        <span className="offer-price">~19,00 kr</span>
                        </div>
                    </div>
                    <button className="btn-primary offer-btn">
                        Lägg i varukorg
                    </button>
                    </div>
                </div>
                </div>
    
                <div className="help-legend">
                    
                    <div className="help-item">
                        <span className="offer-card">
                        </span>
                        <div>
                            <strong>Detaljvy</strong><br/>
                            Klicka på kortet för detaljvy av produkten
                        </div>
                    </div>

                    <div className="help-item">
                        <span className="offer-price">~19,00 kr</span>
                        <div>
                        <strong>Snittpris Sverige</strong><br/>
                        Genomsnittet vi sett hos butikskedjan.
                        </div>
                    </div>
        
                    <div className="help-item">
                        <button className="btn-primary offer-btn" style={{ pointerEvents: 'none', width: 'auto', padding: '6px 12px', fontSize: '14px' }}>
                        Lägg i varukorg
                        </button>
                        <div>
                        <strong>Lägg till i varukorg:</strong><br/>
                                    1. Tryck en gång → 1 st läggs till.<br/>
                                    2. Knappen blir till <strong>– 1 +</strong>. Använd den för att ändra antal.<br/>
                        </div>
                    </div>
                </div>
            </>
            </Modal>
            

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
});

export { SearchView };