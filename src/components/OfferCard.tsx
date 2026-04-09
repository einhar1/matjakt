
/* TODO: Ändra så promos baserar sig på vår data, inte butikens / butikernas egen */

import { useNavigate } from 'react-router-dom';
import type { Product, CurrentPrice, Store } from '../types/database';
import './OfferCard.css';

export type OfferItem = {
  product: Product;
  store: Store;
  currentPrice: CurrentPrice;
}

interface OfferCardProps {
  offer: OfferItem;
  onAddToCart?: (offer: OfferItem) => void;
}

function getDiscountPercent(original: number, promo: number): number {
  return Math.round(((original - promo) / original) * 100);
}

export function OfferCard({ offer, onAddToCart }: OfferCardProps) {
  const navigate = useNavigate();
  function renderPrices() {
    if (offer.currentPrice.promo_price) {
      const pct = getDiscountPercent(offer.currentPrice.price, offer.currentPrice.promo_price);
      return (
        <>
          <span className='discount-badge'>-{pct}%</span>
          <div className='offer-price-row'>
            <span className='offer-price-promo'>
              {offer.currentPrice.promo_price} kr
            </span>
            <span className='offer-price-old'>
              {offer.currentPrice.price} kr
            </span>
          </div>
        </>
      );
    }
    return (
      <span className='offer-price'>
        {offer.currentPrice.price} kr
      </span>
    );
  }

  return (
    <div className='offer-card' onClick={() => navigate(`/details/${offer.product.product_key}`)} style={{ cursor: 'pointer' }}>
        <div className={`offer-image${offer.product.product_image_url ? '' : ' no-image'}`}>
            {offer.product.product_image_url && (
                <img src={offer.product.product_image_url} alt={offer.product.name ? `Bild på ${offer.product.name}` : "Produktbild"}/>
            )}
            <span className='offer-store'>
                {offer.store.store_name}
            </span>
        </div>
        
        <div className='offer-content'>
            <h3>{offer.product.name}</h3>
            {offer.product.brand && (
                <p className='offer-brand'>{offer.product.brand}</p>
            )}
            <div className='offer-prices'>
                {renderPrices()}
            </div>
            <button 
                className='offer-btn'
                /* TODO: ändra vid implementation av AddToCart: */
                onClick={(e) => { e.stopPropagation(); onAddToCart && onAddToCart(offer); }}
            >
                Lägg till i matkasse
            </button>
        </div>
    </div>
  );
}