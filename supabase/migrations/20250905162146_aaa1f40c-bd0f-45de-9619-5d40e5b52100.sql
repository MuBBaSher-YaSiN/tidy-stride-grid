-- Remove the restrictive city check constraint that only allowed 3 specific cities
-- This will allow contractors to be created in any city
ALTER TABLE public.contractors DROP CONSTRAINT contractors_city_check;