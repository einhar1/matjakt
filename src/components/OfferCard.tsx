
/* TODO: Ändra så promos baserar sig på vår data, inte butikens / butikernas egen */

import { useNavigate } from 'react-router-dom';
import type { Product, CurrentPrice, Store } from '../types/database';
import type { Product as CartProduct } from '../views/DetailsView';
import './OfferCard.css';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import { userModel } from '../models/userModel'

export type OfferItem = {
  product: Product & {source?: string, qty?: number};
  store: Store;
  currentPrice: CurrentPrice;
}

export function offerItemToCartProduct(offer: OfferItem): CartProduct {
  return {
    product_id: offer.product.product_id ?? offer.product.product_key,
    product_key: offer.product.product_key,
    name: offer.product.name ?? '',
    brand: offer.product.brand ?? '',
    pack_size: offer.product.pack_size ?? '',
    country_of_origin: offer.product.country_of_origin ?? '',
    product_image_url: offer.product.product_image_url ?? '',
    product_information: '',
    ingredients: '',
    avg_price: offer.currentPrice.promo_price ?? offer.currentPrice.price,
    qty: offer.product.qty ?? 1,
  };
}

interface OfferCardProps {
  offer: OfferItem;
  onAddToCart?: (offer: OfferItem) => void;
  use_avg?: boolean;
}

function getDiscountPercent(original: number, promo: number): number {
  if (!original || original <= 0) return 0;
  return Math.round(((original - promo) / original) * 100);
}

export function OfferCard({ offer, onAddToCart, use_avg }: OfferCardProps) {
  const navigate = useNavigate();
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const { showCartToast } = useToast();

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

    const prefix = use_avg ? '~' : '';
    
    return (
      <span className='offer-price'>
        {offer.currentPrice.price ? `${prefix}${Number(offer.currentPrice.price).toFixed(2)} kr` : 'Pris saknas'}
      </span>
    );
  }

  const badgeText = offer.store?.store_name || (offer.product.source ? offer.product.source.toUpperCase() : null);
  const offerPriceTitle = offer.store?.store_name ? `Billigaste priset nära ${userModel.getCounty() !== ''? userModel.getCounty() : 'Stockholm'}!` : 'Genomsnittl. priset i Sverige'


  function cartButtonOnClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation(); // Förhindra att kortet klickas när knappen klickas
    if (!showQuantitySelector) {
      setShowQuantitySelector(true);
      setQuantity(1);
      addToCart(1);
    }
  }
  function handleIncreaseQuantity(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    const newQuantity = quantity + 1;
    setQuantity(newQuantity);
    addToCart(newQuantity);
  }

  function handleDecreaseQuantity(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    if (quantity <= 1) {
      setShowQuantitySelector(false);
      setQuantity(0);
      addToCart(0);
    }
    else if (quantity > 1) {
      const newQuantity = quantity - 1;
      setQuantity(newQuantity);
      addToCart(newQuantity);
    }
  }

  function handleQuantityChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = parseInt(e.target.value) || 1;

    if (value <= 0) {
      setShowQuantitySelector(false);
      setQuantity(0);
      addToCart(0);
    }
    else if (value > 0) {
      console.log("Setting quantity to", value);
      setQuantity(value);
      addToCart(value);
    }
  }

  function addToCart(qty: number) {
    if (qty <= 0) {
      setShowQuantitySelector(false);
    }
    if (onAddToCart) {
      const offerWithQty = {
        ...offer,
        product: { ...offer.product, qty: qty },
      };
      onAddToCart(offerWithQty);
    }
    
    showCartToast();
  }

  return (
    <div className='offer-card' onClick={() => navigate(`/details/${offer.product.product_key}`)} style={{ cursor: 'pointer' }}>
        <div className={`offer-image${offer.product.product_image_url ? '' : ' no-image'}`}>
            {offer.product.product_image_url && (
                <img src={offer.product.product_image_url} alt={offer.product.name ? `Bild på ${offer.product.name}` : "Produktbild"}/>
            )}
            {badgeText && (
              <span className='offer-store'>
                {badgeText}
              </span>
            )}
        </div>
        
        <div className='offer-content'>
            <h3>{offer.product.name}</h3>
            {offer.product.brand && (
                <p className='offer-brand'>{offer.product.brand}</p>
            )}
            <div title={offerPriceTitle} className='offer-prices'>
                {renderPrices()}
            </div>
            {!showQuantitySelector ? (
              <button className="btn-primary offer-btn" onClick={cartButtonOnClick}>
                Lägg i varukorg
              </button>
            ) : (
              <div className="quantity-selector">
                <button 
                  className="qty-btn qty-minus" 
                  onClick={handleDecreaseQuantity}
                  aria-label="Minska kvantitet"
                >
                  −
                </button>
                <input 
                  type="number" 
                  className="qty-input" 
                  value={quantity}
                  onChange={handleQuantityChange}
                  min="1"
                  aria-label="Kvantitet"
                />
                <button 
                  className="qty-btn qty-plus" 
                  onClick={handleIncreaseQuantity}
                  aria-label="Öka kvantitet"
                >
                  +
                </button>
              </div>
            )}
        </div>
    </div>
  );
}