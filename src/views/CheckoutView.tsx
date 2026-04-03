import { useState } from 'react';
import { FiLock } from 'react-icons/fi';
import '../checkout.css';
import type { userModelType } from '../models/userModel';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import "leaflet/dist/leaflet.css";
import L from "leaflet";

export type CheckoutViewProps = {
  userModel: userModelType
}

interface CartItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  image: string;
}

function CheckoutView(props: CheckoutViewProps) {

  const userModel = props.userModel;
  const cart = props.userModel.cart;
  
  const [cartItems] = useState<CartItem[]>([
    {
      id: '1',
      name: 'DuoComfort Sofa Premium',
      quantity: 1,
      price: 20.0,
      image: 'https://via.placeholder.com/80x80?text=Sofa',
    },
    {
      id: '2',
      name: 'IronOne Desk',
      quantity: 1,
      price: 25.0,
      image: 'https://via.placeholder.com/80x80?text=Desk',
    },
  ]);

  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState(0);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = 5.0;
  const total = subtotal + shipping - appliedDiscount;

  const handleApplyDiscount = () => {
    if (discountCode.toLowerCase() === 'save10') {
      setAppliedDiscount(10);
    } else {
      alert('Invalid discount code');
      setAppliedDiscount(0);
    }
  };

  return (
    <div className="checkout-wrapper">
      <MapView position={[userModel.latitude, userModel.longitude]} usesLocation={userModel.usesLocation}/>
      <div className="checkout-container">
        <h1 className="checkout-title">Review your cart</h1>

        {/* Cart Items */}
        <div className="cart-items">
          {cart.map((item) => (
            <div key={item.product_id} className="cart-item">
              <img src={item.product_image_url} alt={item.name} className="item-image" />
              <div className="item-details">
                <h3 className="item-name">{item.name}</h3>
                <p className="item-quantity">1x</p>
              </div>
              <div className="item-price">${item.avg_price.toFixed(2)}</div>
            </div>
          ))}
        </div>

        {/* Discount Code Section */}
        <div className="discount-section">
          <div className="discount-input-group">
            <input
              type="text"
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              className="discount-input"
            />
            <button onClick={handleApplyDiscount} className="apply-button">
              Apply
            </button>
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <div className="summary-row">
            <span className="summary-label">Subtotal</span>
            <span className="summary-value">${subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Shipping</span>
            <span className="summary-value">${shipping.toFixed(2)}</span>
          </div>
          {appliedDiscount > 0 && (
            <div className="summary-row discount-row">
              <span className="summary-label">Discount</span>
              <span className="summary-value discount-value">
                -${appliedDiscount.toFixed(2)}
              </span>
            </div>
          )}
          <div className="summary-row total-row">
            <span className="summary-label total-label">Total</span>
            <span className="summary-value total-value">${total.toFixed(2)}</span>
          </div>
        </div>

        {/* Pay Button */}
        <button className="pay-button">Pay Now</button>

        {/* Security Message */}
        <div className="security-message">
          <FiLock className="lock-icon" />
          <div>
            <h4>Secure Checkout - SSL Encrypted</h4>
            <p>Ensuring your financial and personal details are secure during every transaction.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MapView({position, usesLocation} : {position: [number, number], usesLocation: boolean}) {
  const stockholmPos: [number, number] = [59.3293, 18.0686]; // Stockholm
  if (!usesLocation) {position = stockholmPos};
  const groceryIcon = L.divIcon({
    className: "",
    html: `
      <div style="
        display:flex;
        flex-direction:column;
        align-items:center;
      ">
        <svg 
          width="32" 
          height="32" 
          viewBox="0 0 16 16" 
          fill="rgb(0, 0, 0)"
        >
          <path d="M13.35 10.48H4.5l-.24-1.25h9.13a1.24 1.24 0 0 0 1.22-1l.84-4a1.25 1.25 0 0 0-1.22-1.51H3l-.22-1.24H.5v1.25h1.25l1.5 7.84a2 2 0 0 0-1.54 1.93 2.09 2.09 0 0 0 2.16 2 2.08 2.08 0 0 0 2.13-2 2 2 0 0 0-.16-.77h5.49a2 2 0 0 0-.16.77 2.09 2.09 0 0 0 2.16 2 2 2 0 1 0 0-4zM14.23 4l-.84 4H4l-.74-4zM3.87 13.27A.85.85 0 0 1 3 12.5a.85.85 0 0 1 .91-.77.84.84 0 0 1 .9.77.84.84 0 0 1-.94.77zm9.48 0a.85.85 0 0 1-.91-.77.92.92 0 0 1 1.81 0 .85.85 0 0 1-.9.77z" />
        </svg>

        <div style="
          margin-top:4px;
          background:white;
          padding:2px 6px;
          border-radius:6px;
          font-size:10px;
          font-weight:600;
          box-shadow:0 2px 6px rgba(0,0,0,0.15);
          white-space: nowrap;
          display: inline-block;
        ">
          ICA Kvantum Sollentuna
        </div>
      </div>
    `,
  });

  return (
    <MapContainer
      center={position}
      zoom={13}
      scrollWheelZoom={true}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={position} icon={groceryIcon}>
      </Marker>
    </MapContainer>
  );
}


export { CheckoutView }