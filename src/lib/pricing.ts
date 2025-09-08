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
    laundryLoads?: number;
    laundryLocation?: 'onsite' | 'offsite' | '';
    insideFridge: boolean;
    insideWindows: boolean;
    hotTubBasic: boolean;
    hotTubFullClean: boolean;
    hotTubFullCleanFrequency?: 'monthly' | 'bi-monthly' | 'tri-monthly' | 'quarterly' | 'every-5-months' | 'every-6-months';
    hotTubFirstClean?: boolean;
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

// Pricing matrix based on bedrooms x bathrooms
const PRICING_MATRIX: Record<number, Record<number, number>> = {
  1: { 1: 105, 2: 125, 3: 145, 4: 165, 5: 185 },
  2: { 1: 135, 2: 155, 3: 175, 4: 195, 5: 215 },
  3: { 1: 165, 2: 185, 3: 205, 4: 225, 5: 245 },
  4: { 1: 195, 2: 215, 3: 235, 4: 255, 5: 275 },
  5: { 1: 225, 2: 245, 3: 265, 4: 285, 5: 305 },
};

export function calculatePrice(
  beds: number, 
  baths: number, 
  halfBaths: number = 0,
  sqft: number, 
  addOns: PricingInput['addOns'] = { 
    deepCleaning: false, 
    laundry: false, 
    insideFridge: false, 
    insideWindows: false, 
    hotTubBasic: false, 
    hotTubFullClean: false 
  },
  frequency: PricingInput['frequency'] = 'one-time',
  serviceType: string = 'residential'
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

  // Get base price from matrix (cap bedrooms and bathrooms at 5)
  const matrixBeds = Math.min(Math.max(beds, 1), 5);
  const matrixBaths = Math.min(Math.max(baths, 1), 5);
  let basePrice = PRICING_MATRIX[matrixBeds]?.[matrixBaths] || 305;

  // Add half bathroom cost ($10 per half bath)
  basePrice += halfBaths * 10;

  // Square footage surcharge
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
  
  // New laundry pricing structure
  if (addOns.laundry) {
    const loads = addOns.laundryLoads || 1;
    if (addOns.laundryLocation === 'offsite') {
      addOnsPrice += 20 + (loads * 9) + (loads * 5); // $20 base + $9 per load + $5 cleaner bonus per load
    } else {
      addOnsPrice += loads * 9; // $9 per load for in-unit
    }
  }
  
  if (addOns.insideFridge) addOnsPrice += 15;
  if (addOns.insideWindows) addOnsPrice += 10;
  
  // Hot tub pricing
  if (addOns.hotTubBasic) addOnsPrice += 20;
  if (addOns.hotTubFullClean) {
    // Base $50 charge for hot tub full drain & clean
    addOnsPrice += 50;
    
    // Additional $50 per occurrence based on frequency (handled in recurring billing)
    // The frequency determines how often the $50 charge is applied:
    // monthly = every month, bi-monthly = every 2 months, etc.
  }

  const subtotal = basePrice + sqftSurcharge + addOnsPrice;

  // Frequency discounts (ONLY for residential subscriptions, NOT for VR)
  let discount = 0;
  let discountPercent = 0;
  
  if (serviceType === 'residential') {
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
  }
  // No discounts for vacation rental (VR) services
  
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

export const EARLIEST_CLEAN_DATE = '2025-09-23';