-- Add test iCal URLs to the most recent booking for testing
UPDATE bookings 
SET ical_urls = ARRAY['https://dummy-airbnb-calendar.com/test-ical', 'https://test-vrbo-calendar.com/dummy']
WHERE customer_name = 'John' 
  AND id = 'e387cdf1-4cb4-4486-83d8-2661b3f063c8';