import { Star, Quote } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const reviews = [
  {
    name: "Sarah M.",
    location: "New Smyrna Beach",
    rating: 5,
    text: "CleanNami has been a game-changer for my vacation rental! Their team is incredibly thorough and always leaves the property spotless. My guests consistently comment on how clean and fresh everything feels. Worth every penny!",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Mike & Jennifer R.",
    location: "Daytona Beach",
    rating: 5,
    text: "We've been using CleanNami for our beachfront condo for over a year now. The automated booking system syncs perfectly with our Airbnb calendar, and we never have to worry about turnovers. Highly recommend!",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Linda K.",
    location: "Edgewater",
    rating: 5,
    text: "I was skeptical about the pricing at first, but the transparency is amazing. No hidden fees, no surprises. The quality is consistently excellent and my 5-star reviews from guests speak for themselves.",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Carlos D.",
    location: "South Daytona",
    rating: 5,
    text: "The attention to detail is incredible! They don't just clean - they stage everything perfectly. Fresh linens, restocked amenities, even the hot tub is perfectly balanced. My guests feel like VIPs every time.",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Amanda T.",
    location: "Port Orange",
    rating: 5,
    text: "As a busy mom of three, CleanNami's residential service has been a lifesaver. They're reliable, thorough, and work around my schedule. My house always feels like a sanctuary after they've been here.",
    service: "Residential Cleaning"
  },
  {
    name: "Robert & Diana P.",
    location: "New Smyrna Beach",
    rating: 5,
    text: "We manage multiple properties and CleanNami handles them all flawlessly. The GPS check-in/out gives us peace of mind, and their backup system means we're never left hanging. True professionals!",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Jessica L.",
    location: "Daytona Beach",
    rating: 5,
    text: "The eco-friendly products they use are perfect for our family. My kids have allergies and I love that I don't have to worry about harsh chemicals. Plus, the house smells amazing - like a fresh ocean breeze!",
    service: "Residential Cleaning"
  },
  {
    name: "Tom H.",
    location: "Edgewater",
    rating: 5,
    text: "I've tried other cleaning services before, but none compare to CleanNami's consistency. Every single cleaning meets their high standards. It's like having a dedicated housekeeping team for my rental.",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Rachel & David M.",
    location: "South Daytona",
    rating: 5,
    text: "The property condition reports are so helpful! We caught a maintenance issue early because their team noticed and reported it. They truly care about our investment, not just the cleaning.",
    service: "Vacation Rental Cleaning"
  },
  {
    name: "Nicole F.",
    location: "Port Orange",
    rating: 5,
    text: "Switching to CleanNami was the best decision for our beach house. The same-day turnovers are incredible - guests check out at 11am and new ones can check in at 4pm with confidence. Absolutely seamless!",
    service: "Vacation Rental Cleaning"
  }
];

const ReviewsSection = () => {
  return (
    <section className="py-16 px-2 sm:px-4 lg:px-6 w-full bg-gradient-subtle">
      <div className="w-full max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">
            What Our Customers Say
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Join hundreds of satisfied property owners across Florida who trust CleanNami 
            for their cleaning needs. Here's what they have to say about our service.
          </p>
        </div>

        {/* Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {reviews.map((review, index) => (
            <Card key={index} className="shadow-card bg-card/80 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              <CardContent className="p-6">
                {/* Quote Icon */}
                <Quote className="h-8 w-8 text-accent mb-4 opacity-50" />
                
                {/* Review Text */}
                <p className="text-muted-foreground mb-4 italic leading-relaxed">
                  "{review.text}"
                </p>
                
                {/* Stars */}
                <div className="flex items-center gap-1 mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className="h-4 w-4 fill-accent text-accent" 
                    />
                  ))}
                </div>
                
                {/* Customer Info */}
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-primary text-sm">
                    {review.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {review.location} • {review.service}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Trust Indicators */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-card/50 backdrop-blur-sm rounded-full px-6 py-3 shadow-card">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-accent text-accent" />
              ))}
            </div>
            <span className="text-lg font-semibold text-primary">5.0</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground font-medium">Based on 500+ reviews</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ReviewsSection;