
import '../home.css'
import '../style.css'
import type { Product, CurrentPrice, Store } from '../types/database';

export type OfferItem = {
  product: Product;
  store: Store;
  currentPrice: CurrentPrice;
}

export type HomeViewProps = {
  offers: OfferItem[];
  // onSearch: (query: string) => void;
}

function HomeView(props: HomeViewProps) {

  // function handleSearchClick() {
  //   const input = document.getElementById("seed-search-input") as HTMLInputElement;
  //   if (input) {
  //     props.onSearch(input.value);
  //   };
  // }

  // function handleSearchKeyDownACB(e: React.KeyboardEvent<HTMLInputElement>) {
  //   if (e.key === 'Enter') {
  //     const input = e.currentTarget;
  //     props.onSearch(input.value);
  //     // Clears focus after enterd
  //     input.blur();
  //   }
  // }

  function renderPrices(offer: OfferItem) {
    if (offer.currentPrice.promo_price) {
      return (
        <span className='home-price-promo'>
          {offer.currentPrice.promo_price} kr
        </span>
      );
    }
    return (
      <span className='home-price'>
        {offer.currentPrice.price} kr
      </span>
    );
  }

  function renderOfferCard(offer: OfferItem) {
    return (
      <div
        key={`${offer.currentPrice.store_id}-${offer.currentPrice.product_key}`}
        className='home-offer-card'
      >
        <span className='home-offer-store'>
          {offer.store.store_name}
        </span>
        <h3>{offer.product.name}</h3>
        {offer.product.brand && (
          <p className='home-offer-brand'>{offer.product.brand}</p>
        )}
        <div className='home-offer-prices'>
          {renderPrices(offer)}
        </div>
      </div>
    )
  }

  return (
    <div className="home-wrapper">
      {/* <header className="home-search-bar">
        <input className="search-form">
          <CiSearch className="search-icon" size={24} />
          <input 
            type="text" 
            placeholder="Sök på produkt, t.ex. mjölk, kaffe..." 
            // onKeyDown={handleSearchKeyDownACB}
            className="search-input"
          />
          <button type="submit" className="search-button" onClick={handleSearchClick}>Sök</button>
        </input>
      </header> */}

      <div className="home-container">
        <section className="home-hero">
          <div className="badge">Data driven grocery optimization</div>
          <h1>Realtidspriser.<br/><span className="highlight-text">Optimerade inköp.</span></h1>
          <p>
            Automatiserad insamling från <strong>ICA, Coop, Willys och Hemköp</strong>. 
            Jämför, bygg din matkasse och sluta gissa var det är billigast!
          </p>
        </section>
        <section className="home-offers">
          <h2>Veckans klipp</h2>
          <div className="home-offers-grid">
            {props.offers.map(renderOfferCard)}
          </div>
        </section>
      </div>
    </div>
  );
}

export { HomeView };