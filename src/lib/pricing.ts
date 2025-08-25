// CleanNami Pricing Logic
// Matches the database function calculate_price exactly

export interface PricingInput {
  beds: number;
  baths: number;
  sqft: number;
}

export interface PricingResult {
  price: number;
  isCustomQuote: boolean;
  breakdown: {
    basePrice: number;
    sqftSurcharge: number;
  };
}

export function calculatePrice(beds: number, baths: number, sqft: number): PricingResult {
  // Handle custom quote case
  if (sqft >= 3000) {
    return {
      price: 0,
      isCustomQuote: true,
      breakdown: {
        basePrice: 0,
        sqftSurcharge: 0,
      },
    };
  }

  let price = 0;
  let sqftSurcharge = 0;

  // Base pricing grid
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
    // Fallback calculation for 6+ bedrooms
    price = 100 + (beds - 1) * 30 + (baths - 1) * 20;
  }

  // Square footage surcharge
  if (sqft >= 1000 && sqft < 1500) {
    sqftSurcharge = 25;
  } else if (sqft >= 1500 && sqft < 2000) {
    sqftSurcharge = 50;
  } else if (sqft >= 2000 && sqft < 2500) {
    sqftSurcharge = 75;
  } else if (sqft >= 2500 && sqft < 3000) {
    sqftSurcharge = 100;
  }

  const basePrice = price;
  const finalPrice = price + sqftSurcharge;

  return {
    price: finalPrice,
    isCustomQuote: false,
    breakdown: {
      basePrice,
      sqftSurcharge,
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