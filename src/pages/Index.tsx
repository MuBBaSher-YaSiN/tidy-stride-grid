import { Link } from "react-router-dom";
import { CleanNamiButton } from "@/components/ui/button-variants";
import { PricingCalculator } from "@/components/PricingCalculator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FLORIDA_CITIES } from "@/lib/pricing";
import { Sparkles, Shield, Clock, CheckCircle, Menu, X } from "lucide-react";
import heroImage from "@/assets/hero-cleaning.jpg";
import logo from "@/assets/logo.png";
import { useState } from "react";


const Index = () => {
   const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="min-h-screen w-full bg-gradient-hero">
      {/* Navigation */}
      <nav className="w-full px-2 sm:px-4 lg:px-6">
        <div className="flex justify-between items-center py-2 sm:py-4 w-full max-w-none">
          {/* Brand section - more prominent sizing */}
          <div className="flex flex-row items-center gap-2 sm:gap-3 min-w-0 flex-shrink-0">
            <div className="relative inline-flex items-center gap-1 sm:gap-2">
              {/* Sparkle left - visible on larger screens */}
              <span className="absolute -left-6 sm:-left-4 -top-2 hidden md:block animate-float">
                <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-primary drop-shadow-[0_0_8px_theme(colors.primary.DEFAULT)]" />
              </span>

              <h1
                className="
                  relative select-none
                  text-2xl xs:text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl
                  heading-arkhip 
                  bg-gradient-ocean bg-clip-text text-transparent ml-3
                  [background-size:200%_100%] animate-ocean
                  drop-shadow-[0_6px_24px_rgba(14,165,233,0.35)]
                  hover:scale-[1.01] transition-transform duration-500
                  whitespace-nowrap
                "
                title="CleanNami"
              >
                CleanNami

                {/* Shine sweep */}
                <span
                  className="
                    pointer-events-none absolute inset-0
                    [mask-image:linear-gradient(115deg,transparent_30%,rgba(0,0,0,0.9)_50%,transparent_70%)]
                    bg-white/50
                    -translate-x-full animate-shine
                    rounded
                  "
                />
              </h1>

              {/* Sparkle right - visible on larger screens */}
              <span className="absolute -right-6 sm:-right-7 -bottom-2 hidden md:block animate-float-delayed">
                <Sparkles className="h-4 w-4 sm:h-6 sm:w-6 text-primary drop-shadow-[0_0_8px_theme(colors.accent.DEFAULT)]" />
              </span>
            </div>

            <img 
              src={logo} 
              alt="CleanNami Logo" 
              className="w-10 h-10 xs:w-12 xs:h-12 ml-4 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 xl:w-28 xl:h-28 flex-shrink-0" 
            />
          </div>

          {/* Desktop Links - better responsive breakpoint */}
          <div className="hidden lg:flex space-x-2 2xl:space-x-4 items-center flex-shrink-0">
            <a href="https://ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:text-primary/80 transition-colors text-sm 2xl:text-sm whitespace-nowrap">
              Ceenami Music
            </a>
            <a href="https://ceenamihaus.ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:text-primary/80 transition-colors text-sm 2xl:text-sm whitespace-nowrap">
              Ceenami Haus
            </a>
            <a href="https://shop.ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary font-semibold hover:text-primary/80 transition-colors text-sm 2xl:text-sm whitespace-nowrap">
              Shop
            </a>
            <Link to="/contractor">
              <CleanNamiButton variant="ghost" size="sm" className="text-sm 2xl:text-sm px-2 2xl:px-3">Contractor Login</CleanNamiButton>
            </Link>
            <Link to="/admin">
              <CleanNamiButton variant="ocean" size="sm" className="text-sm 2xl:text-sm px-2 2xl:px-3">Admin</CleanNamiButton>
            </Link>
          </div>
          
          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 flex-shrink-0"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
          </button>
        </div>

        {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="absolute right-2 top-16 sm:top-20 bg-white rounded-lg shadow-lg flex flex-col space-y-2 p-4 xl:hidden z-50 min-w-48 max-w-xs">
            <a href="https://ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors p-2 text-center">
              Ceenami Music
            </a>
            <a href="https://ceenamihaus.ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors p-2 text-center">
              Ceenami Haus
            </a>
            <a href="https://shop.ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors p-2 text-center">
              Shop
            </a>
            <Link to="/contractor" onClick={() => setMenuOpen(false)}>
              <CleanNamiButton variant="ghost" className="w-full">
                Contractor Login
              </CleanNamiButton>
            </Link>
            <Link to="/admin" onClick={() => setMenuOpen(false)}>
              <CleanNamiButton variant="ocean" className="w-full">
                Admin
              </CleanNamiButton>
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section with Image */}
      <section className="relative py-8 px-2 sm:px-4 lg:px-6 w-full">
        <div className="w-full max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-4xl md:text-5xl font-bold text-primary mb-6">
                Effortless Vacation Rental Turnovers.
                <span className="block bg-gradient-ocean bg-clip-text text-transparent">
                  Five-Star Cleans, Every Time.
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-8">
                CleanNami handles every detail of your vacation rental turnover — from linens and laundry to staging and hot tub care — so you can relax, impress guests, and always get five-star reviews.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-4 mb-8">
                {FLORIDA_CITIES.map((city) => (
                  <Badge
                    key={city}
                    variant="secondary"
                    className="px-4 py-2 text-sm"
                  >
                    {city}
                  </Badge>
                ))}
              </div>

              <Link to="/book">
                <CleanNamiButton variant="hero" size="xl" className="mb-8">
                  Book Your Cleaning
                </CleanNamiButton>
              </Link>
            </div>

            <div className="relative">
              <img
                src={heroImage}
                alt="Clean, modern home interior with ocean views"
                className="rounded-lg shadow-hero w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent rounded-lg"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-2 sm:px-4 lg:px-6 w-full">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <Shield className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Seamless Booking & Automation</CardTitle>
              </CardHeader>
              <CardContent>
                <p className=" text-muted-foreground">
                  Set up your property preferences once, and CleanNami takes care
                  of the rest. Every booking is automatically scheduled, with all
                  add-ons and customer checklists integrated into the clean.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <Clock className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Consistent & Transparent Pricing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No haggling, no hidden fees. You see the exact price upfront —
                  based on your property details, laundry needs, and hot tub
                  options — and it stays the same every clean.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <Sparkles className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Turnkey Turnovers, Not Just Cleaning</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Our cleaners don't just scrub — they stage beds, restock
                  essentials already in your unit, reset hot tubs, and prepare
                  your property so guests feel like the very first check-in.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center shadow-card bg-gradient-card">
              <CardHeader>
                <CheckCircle className="h-12 w-12 text-accent mx-auto mb-4" />
                <CardTitle>Reliability You Can Trust</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  {" "}
                  Cleaners are GPS-verified at check-in and check-out. With
                  performance tracking and a dedicated on-call backup pool, your
                  turnovers get done on time, every time.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Pricing Calculator */}
          <div className="flex justify-center">
            {/* <PricingCalculator /> */}
          </div>
        </div>
      </section>

      {/* Service Types */}
      <section className="py-16 px-2 sm:px-4 lg:px-6 w-full">
        <div className="w-full max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-primary mb-12">
            Our Services
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
               <Card className="shadow-card bg-gradient-card">
              <CardHeader>
                <CardTitle className="text-primary">
                  Vacation Rental Cleaning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Automated turnover cleaning synced with your booking calendar.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• iCal integration for automatic scheduling</li>
                  <li>• Same day cleaning turnovers</li>
                  <li>• Inventory restocking and staging</li>
                  <li>• Property condition reports</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="shadow-card bg-gradient-card">
              <CardHeader>
                <CardTitle className="text-primary">
                  Residential Cleaning
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Regular cleaning services for your home with flexible scheduling
                  from 1-6 months.
                </p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>• Recurring maintenance cleaning</li>
                  <li>• Eco-friendly products available</li>
                  <li>• Customizable cleaning checklist</li>
                  <li>• Flexible scheduling options</li>
                </ul>
              </CardContent>
            </Card>

          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-2 sm:px-4 lg:px-6 text-center bg-gradient-ocean text-primary-foreground w-full">
        <div className="w-full max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Experience the CleanNami Difference?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of satisfied customers across Florida's coast. Book
            your first cleaning today!
          </p>
          <Link to="/book">
            <CleanNamiButton variant="hero" size="xl">
              Get Started Now
            </CleanNamiButton>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-2 sm:px-4 lg:px-6 text-center text-muted-foreground bg-card w-full">
        <p>
          &copy; 2025 CleanNami. Professional cleaning services across Florida.
        </p>
        <p className="text-sm mt-2">
          Serving New Smyrna Beach, Daytona Beach, and Edgewater
        </p>
      </footer>
    </div>
  );
};

export default Index;