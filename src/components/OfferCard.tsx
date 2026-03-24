
/* TODO: Ändra så promos baserar sig på vår data, inte butikens / butikernas egen */

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
  function renderPrices() {
    if (offer.currentPrice.promo_price) {
        //@ts-ignore for offer.currentPrice.price
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
    <div className='offer-card'>
      <span className='offer-store'>
        {offer.store.store_name}
      </span>
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
        onClick={() => onAddToCart && onAddToCart(offer)}
      >
        Lägg till i matkasse
      </button>
    </div>
  );
}