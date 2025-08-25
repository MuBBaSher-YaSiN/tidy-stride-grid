-- Fix function search path security issues for CleanNami functions

-- Update calculate_price function with secure search_path
CREATE OR REPLACE FUNCTION public.calculate_price(beds INTEGER, baths INTEGER, sqft INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_price INTEGER := 100;
  price INTEGER := 0;
  sqft_surcharge INTEGER := 0;
BEGIN
  -- Handle custom quote case
  IF sqft >= 3000 THEN
    RETURN -1; -- Indicates custom quote required
  END IF;

  -- Base pricing grid
  IF beds = 1 THEN
    CASE baths
      WHEN 1 THEN price := 100;
      WHEN 2 THEN price := 120;
      WHEN 3 THEN price := 140;
      WHEN 4 THEN price := 160;
      WHEN 5 THEN price := 180;
      ELSE price := 100 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 2 THEN
    CASE baths
      WHEN 1 THEN price := 130;
      WHEN 2 THEN price := 150;
      WHEN 3 THEN price := 170;
      WHEN 4 THEN price := 190;
      WHEN 5 THEN price := 210;
      ELSE price := 130 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 3 THEN
    CASE baths
      WHEN 1 THEN price := 160;
      WHEN 2 THEN price := 180;
      WHEN 3 THEN price := 200;
      WHEN 4 THEN price := 220;
      WHEN 5 THEN price := 240;
      ELSE price := 160 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 4 THEN
    CASE baths
      WHEN 1 THEN price := 190;
      WHEN 2 THEN price := 210;
      WHEN 3 THEN price := 230;
      WHEN 4 THEN price := 250;
      WHEN 5 THEN price := 270;
      ELSE price := 190 + (baths - 1) * 20;
    END CASE;
  ELSIF beds = 5 THEN
    CASE baths
      WHEN 1 THEN price := 220;
      WHEN 2 THEN price := 240;
      WHEN 3 THEN price := 260;
      WHEN 4 THEN price := 280;
      WHEN 5 THEN price := 300;
      ELSE price := 220 + (baths - 1) * 20;
    END CASE;
  ELSE
    -- Fallback calculation for 6+ bedrooms
    price := 100 + (beds - 1) * 30 + (baths - 1) * 20;
  END IF;

  -- Square footage surcharge
  IF sqft >= 1000 AND sqft < 1500 THEN
    sqft_surcharge := 25;
  ELSIF sqft >= 1500 AND sqft < 2000 THEN
    sqft_surcharge := 50;
  ELSIF sqft >= 2000 AND sqft < 2500 THEN
    sqft_surcharge := 75;
  ELSIF sqft >= 2500 AND sqft < 3000 THEN
    sqft_surcharge := 100;
  END IF;

  RETURN price + sqft_surcharge;
END;
$$;

-- Update calculate_payout function with secure search_path
CREATE OR REPLACE FUNCTION public.calculate_payout(price_cents INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  payout_cents INTEGER;
BEGIN
  payout_cents := ROUND(price_cents * 0.70);
  
  -- Minimum payout is $60
  IF payout_cents < 6000 THEN
    payout_cents := 6000;
  END IF;
  
  RETURN payout_cents;
END;
$$;