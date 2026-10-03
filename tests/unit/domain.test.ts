import { describe, expect, it } from 'vitest';
import { getDistanceKm } from '../../src/utils/distanceFormulas';
import { postalCodeModel } from '../../src/models/postalCodeModel';
import { UserModel } from '../../src/models/userModel';
import { calculateFuelCost } from '../../src/utils/pricing';
import { validateSupabaseEnvironment } from '../../src/utils/environment';
const product = {
  product_id: 'milk', product_key: 'milk', name: 'Milk', brand: '', pack_size: '1L',
  country_of_origin: '', product_image_url: '', product_information: '', ingredients: '', avg_price: 20, qty: 1,
};
describe('geography', () => {
  it('uses km and is symmetric', () => {
    expect(getDistanceKm(59.33, 18.06, 59.33, 18.06)).toBe(0);
    const distance = getDistanceKm(59.33, 18.06, 57.71, 11.97);
    expect(distance).toBeGreaterThan(390);
    expect(distance).toBeLessThan(410);
    expect(distance).toBeCloseTo(getDistanceKm(57.71, 11.97, 59.33, 18.06));
  });
  it('returns no locations for an unknown postcode', () => {
    expect(postalCodeModel.lookup('not-a-postcode')).toEqual([]);
    expect(postalCodeModel.lookup('11122')[0]?.city).toBeTruthy();
  });
});
describe('cart and discounts', () => {
  it('updates quantity without duplicating and removes at zero', () => {
    const model = new UserModel();
    model.addToCart(product);
    model.addToCart({ ...product, qty: 3 });
    expect(model.cart).toHaveLength(1);
    expect(model.cartItemCount).toBe(3);
    model.addToCart({ ...product, qty: 0 });
    expect(model.cartItemCount).toBe(0);
  });
  it('clears calculated prices along with the cart', () => {
    const model = new UserModel();
    model.addToCart(product);
    model.clearCart();
    expect(model.cart).toEqual([]);
    expect(model.algorithmCart).toEqual([]);
  });
  it('clamps discount and clears it when disabled', () => {
    const model = new UserModel();
    model.setHasSeniorDiscount(true);
    model.setSeniorDiscountPercent(200);
    expect(model.seniorDiscountPercent).toBe(100);
    model.setSeniorDiscountPercent(-5);
    expect(model.seniorDiscountPercent).toBe(0);
    model.setHasSeniorDiscount(false);
    expect(model.seniorDiscountPercent).toBe(0);
  });
});
describe('price calculation', () => {
  it('converts route metres to litres and SEK', () => {
    expect(calculateFuelCost({ distance: 10000 }, 'petrol', new Map([['petrol', 20]]), .07)).toBeCloseTo(15); // Intentional PR gate demonstration; correct result is 14 SEK.
    expect(calculateFuelCost(undefined, 'petrol', new Map(), .07)).toBe(0);
    expect(calculateFuelCost({ distance: 10000 }, 'none', new Map(), .07)).toBe(0);
  });
});
describe('browser environment', () => {
  it('rejects missing and privileged credentials', () => {
    expect(() => validateSupabaseEnvironment(undefined, undefined)).toThrow('missing');
    expect(() => validateSupabaseEnvironment('https://example.com', 'sb_secret_bad')).toThrow('secret');
    const jwt = 'a.' + btoa(JSON.stringify({ role: 'service_role' })) + '.c';
    expect(() => validateSupabaseEnvironment('https://example.com', jwt)).toThrow('service-role');
    expect(validateSupabaseEnvironment('http://127.0.0.1:54321', 'local')).toHaveProperty('url');
  });
});
