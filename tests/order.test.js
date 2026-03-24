/**
 * Unit tests for order placement and status transitions
 * Run: npm test
 */

const STATUS_TRANSITIONS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

// ─── Helper ───────────────────────────────────────────────────────────────────
const isValidTransition = (current, next) => {
  const allowed = STATUS_TRANSITIONS[current] || [];
  return allowed.includes(next);
};

// ─── Status Transition Tests ───────────────────────────────────────────────────
describe('Order Status Transitions', () => {
  test('placed → confirmed is valid', () => {
    expect(isValidTransition('placed', 'confirmed')).toBe(true);
  });

  test('placed → cancelled is valid', () => {
    expect(isValidTransition('placed', 'cancelled')).toBe(true);
  });

  test('placed → delivered is INVALID', () => {
    expect(isValidTransition('placed', 'delivered')).toBe(false);
  });

  test('placed → shipped is INVALID', () => {
    expect(isValidTransition('placed', 'shipped')).toBe(false);
  });

  test('confirmed → packed is valid', () => {
    expect(isValidTransition('confirmed', 'packed')).toBe(true);
  });

  test('confirmed → delivered is INVALID', () => {
    expect(isValidTransition('confirmed', 'delivered')).toBe(false);
  });

  test('packed → shipped is valid', () => {
    expect(isValidTransition('packed', 'shipped')).toBe(true);
  });

  test('packed → cancelled is INVALID', () => {
    expect(isValidTransition('packed', 'cancelled')).toBe(false);
  });

  test('shipped → delivered is valid', () => {
    expect(isValidTransition('shipped', 'delivered')).toBe(true);
  });

  test('delivered → cancelled is INVALID', () => {
    expect(isValidTransition('delivered', 'cancelled')).toBe(false);
  });

  test('cancelled → any is INVALID', () => {
    ['placed', 'confirmed', 'packed', 'shipped', 'delivered'].forEach((status) => {
      expect(isValidTransition('cancelled', status)).toBe(false);
    });
  });
});

// ─── Order Placement Logic Tests ──────────────────────────────────────────────
describe('Order Placement Business Logic', () => {
  const checkStockAvailability = (stock, requestedQuantity) => stock >= requestedQuantity;
  const isProductPurchasable = (product) => product.status === 'active' && product.stock > 0;
  const calculateTotal = (items) =>
    items.reduce((sum, item) => sum + item.priceAtPurchase * item.quantity, 0);

  test('should allow order when stock is sufficient', () => {
    expect(checkStockAvailability(10, 3)).toBe(true);
  });

  test('should deny order when quantity exceeds stock', () => {
    expect(checkStockAvailability(2, 5)).toBe(false);
  });

  test('should deny order when stock is exactly 0', () => {
    expect(checkStockAvailability(0, 1)).toBe(false);
  });

  test('should allow order when quantity equals stock', () => {
    expect(checkStockAvailability(5, 5)).toBe(true);
  });

  test('should not allow purchase of inactive product', () => {
    const inactiveProduct = { status: 'inactive', stock: 10 };
    expect(isProductPurchasable(inactiveProduct)).toBe(false);
  });

  test('should not allow purchase of out-of-stock active product', () => {
    const outOfStock = { status: 'active', stock: 0 };
    expect(isProductPurchasable(outOfStock)).toBe(false);
  });

  test('should allow purchase of active in-stock product', () => {
    const validProduct = { status: 'active', stock: 5 };
    expect(isProductPurchasable(validProduct)).toBe(true);
  });

  test('should calculate total amount correctly', () => {
    const items = [
      { priceAtPurchase: 1000, quantity: 2 },
      { priceAtPurchase: 500, quantity: 3 },
    ];
    expect(calculateTotal(items)).toBe(3500);
  });

  test('should use discountPrice over price when available', () => {
    const product = { price: 1000, discountPrice: 800 };
    const effectivePrice = product.discountPrice != null ? product.discountPrice : product.price;
    expect(effectivePrice).toBe(800);
  });

  test('should use price when discountPrice is null', () => {
    const product = { price: 1000, discountPrice: null };
    const effectivePrice = product.discountPrice != null ? product.discountPrice : product.price;
    expect(effectivePrice).toBe(1000);
  });
});

// ─── Discount Price Validation ─────────────────────────────────────────────────
describe('Product Discount Price Validation', () => {
  const isValidDiscount = (price, discountPrice) => {
    if (discountPrice == null) return true;
    return discountPrice < price;
  };

  test('discount price less than price is valid', () => {
    expect(isValidDiscount(1000, 800)).toBe(true);
  });

  test('discount price equal to price is INVALID', () => {
    expect(isValidDiscount(1000, 1000)).toBe(false);
  });

  test('discount price greater than price is INVALID', () => {
    expect(isValidDiscount(1000, 1200)).toBe(false);
  });

  test('null discount price is valid (optional field)', () => {
    expect(isValidDiscount(1000, null)).toBe(true);
  });
});
