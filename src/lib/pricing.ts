// CleanNami Pricing Logic
// Matches the database function calculate_price exactly

export interface PricingInput {
  beds: number;
  baths: number;
  halfBaths: number;
  sqft: number;
  addOns: {
    deepCleaning: boolean;
    laundry: boolean;
    insideFridge: boolean;
    insideWindows: boolean;
  };
  frequency: 'one-time' | 'weekly' | 'bi-weekly' | 'tri-weekly' | 'monthly';
}

export interface PricingResult {
  price: number;
  isCustomQuote: boolean;
  breakdown: {
    basePrice: number;
    sqftSurcharge: number;
    addOnsPrice: number;
    discount: number;
    finalPrice: number;
  };
}

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
] as const;

export type USState = typeof US_STATES[number];

export function calculatePrice(
  beds: number, 
  baths: number, 
  halfBaths: number = 0,
  sqft: number, 
  addOns: PricingInput['addOns'] = { deepCleaning: false, laundry: false, insideFridge: false, insideWindows: false },
  frequency: PricingInput['frequency'] = 'one-time'
): PricingResult {
  // Handle custom quote case
  if (sqft >= 3000) {
    return {
      price: 0,
      isCustomQuote: true,
      breakdown: {
        basePrice: 0,
        sqftSurcharge: 0,
        addOnsPrice: 0,
        discount: 0,
        finalPrice: 0,
      },
    };
  }

  let price = 0;
  
  // New pricing rules - Base Price: $100 (1 bedroom, 1 bathroom, under 1000 sq ft)
  // Add $30 per additional bedroom, $20 per additional bathroom
  
  // Base pricing grid as specified
  if (beds === 1) {
    switch (baths) {
      case 1: price = 100; break;
      case 2: price = 120; break;
      case 3: price = 140; break;
      case 4: price = 160; break;
      case 5: price = 180; break;
      default: price = 100 + (baths - 1) * 20; break;
    }
  } else if (beds === 2) {
    switch (baths) {
      case 1: price = 130; break;
      case 2: price = 150; break;
      case 3: price = 170; break;
      case 4: price = 190; break;
      case 5: price = 210; break;
      default: price = 130 + (baths - 1) * 20; break;
    }
  } else if (beds === 3) {
    switch (baths) {
      case 1: price = 160; break;
      case 2: price = 180; break;
      case 3: price = 200; break;
      case 4: price = 220; break;
      case 5: price = 240; break;
      default: price = 160 + (baths - 1) * 20; break;
    }
  } else if (beds === 4) {
    switch (baths) {
      case 1: price = 190; break;
      case 2: price = 210; break;
      case 3: price = 230; break;
      case 4: price = 250; break;
      case 5: price = 270; break;
      default: price = 190 + (baths - 1) * 20; break;
    }
  } else if (beds === 5) {
    switch (baths) {
      case 1: price = 220; break;
      case 2: price = 240; break;
      case 3: price = 260; break;
      case 4: price = 280; break;
      case 5: price = 300; break;
      default: price = 220 + (baths - 1) * 20; break;
    }
  } else {
    // For 6+ bedrooms: Base $100 + (beds-1)*$30 + (baths-1)*$20
    price = 100 + (beds - 1) * 30 + (baths - 1) * 20;
  }

  // Add half bathroom cost (assume $10 per half bath based on pattern)
  price += halfBaths * 10;

  // Square footage surcharge - updated ranges
  let sqftSurcharge = 0;
  if (sqft >= 1000 && sqft < 1500) {
    sqftSurcharge = 25;
  } else if (sqft >= 1500 && sqft < 2000) {
    sqftSurcharge = 50;
  } else if (sqft >= 2000 && sqft < 2500) {
    sqftSurcharge = 75;
  } else if (sqft >= 2500 && sqft < 3000) {
    sqftSurcharge = 100;
  }

  // Add-ons pricing
  let addOnsPrice = 0;
  if (addOns.deepCleaning) addOnsPrice += 30;
  if (addOns.laundry) addOnsPrice += 9;
  if (addOns.insideFridge) addOnsPrice += 15;
  if (addOns.insideWindows) addOnsPrice += 10;

  const basePrice = price;
  const subtotal = price + sqftSurcharge + addOnsPrice;

  // Frequency discounts
  let discount = 0;
  let discountPercent = 0;
  switch (frequency) {
    case 'weekly':
      discountPercent = 0.15; // 15% off
      break;
    case 'bi-weekly':
      discountPercent = 0.10; // 10% off
      break;
    case 'tri-weekly':
      discountPercent = 0.05; // 5% off
      break;
    case 'monthly':
      discountPercent = 0.05; // 5% off
      break;
    default:
      discountPercent = 0; // No discount for one-time
  }
  
  discount = Math.round(subtotal * discountPercent);
  const finalPrice = subtotal - discount;

  return {
    price: finalPrice,
    isCustomQuote: false,
    breakdown: {
      basePrice,
      sqftSurcharge,
      addOnsPrice,
      discount,
      finalPrice,
    },
  };
}

export function calculatePayout(priceCents: number): number {
  let payoutCents = Math.round(priceCents * 0.70);
  
  // Minimum payout is $60
  if (payoutCents < 6000) {
    payoutCents = 6000;
  }
  
  return payoutCents;
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export const FLORIDA_CITIES = [
  'New Smyrna Beach',
  'Daytona Beach', 
  'Edgewater'
] as const;

export type FloridaCity = typeof FLORIDA_CITIES[number];

export const EARLIEST_CLEAN_DATE = '2025-09-21';