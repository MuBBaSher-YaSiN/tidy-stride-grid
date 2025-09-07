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
    <div className="min-h-screen bg-gradient-hero">
      {/* Navigation */}
      <nav className="flex justify-between items-center p-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <img src={logo} alt="logo" className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-transparent" />
        </div>
        {/* Desktop Links */}
        <div className="hidden lg:flex space-x-4 items-center">
          <a href="https://ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
            Ceenami Music
          </a>
          <a href="https://ceenamihaus.ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
            Ceenami Haus
          </a>
          <a href="https://shop.ceenami.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors">
            Shop
          </a>
          <Link to="/contractor">
            <CleanNamiButton variant="ghost">Contractor Login</CleanNamiButton>
          </Link>
          <Link to="/admin">
            <CleanNamiButton variant="ocean">Admin</CleanNamiButton>
          </Link>
        </div>
        
        {/* Mobile Menu Button */}
        <button
          className="lg:hidden p-2"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
        </button>
         {/* Mobile Dropdown */}
        {menuOpen && (
          <div className="absolute right-6 top-16 bg-white rounded-lg shadow-md flex flex-col space-y-2 p-4 lg:hidden z-50 min-w-48">
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

      {/* Hero Section - CleanNami Branding */}
      <section className="relative py-12 px-6 max-w-7xl mx-auto text-center">
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-arkhip font-bold text-primary mb-8 md:mb-12">
          CleanNami
        </h1>
      </section>

      {/* Hero Section with Image */}
      <section className="relative py-8 px-6 max-w-7xl mx-auto">
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
      </section>

      {/* Features Section */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
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
                Our cleaners don’t just scrub — they stage beds, restock
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
      </section>

      {/* Service Types */}
      <section className="py-16 px-6 max-w-4xl mx-auto">
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
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center bg-gradient-ocean text-primary-foreground">
        <div className="max-w-3xl mx-auto">
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
      <footer className="py-8 px-6 text-center text-muted-foreground bg-card">
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
