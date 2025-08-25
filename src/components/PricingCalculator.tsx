import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { calculatePrice, formatCurrency, type PricingResult } from "@/lib/pricing";

interface PricingCalculatorProps {
  onPriceChange?: (result: PricingResult) => void;
}

export function PricingCalculator({ onPriceChange }: PricingCalculatorProps) {
  const [beds, setBeds] = useState<number>(2);
  const [baths, setBaths] = useState<number>(2);
  const [sqft, setSqft] = useState<number>(1200);
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);

  useEffect(() => {
    const result = calculatePrice(beds, baths, sqft);
    setPricingResult(result);
    onPriceChange?.(result);
  }, [beds, baths, sqft, onPriceChange]);

  return (
    <Card className="w-full max-w-md bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="text-center text-primary">Get Your Quote</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bedrooms">Bedrooms</Label>
            <Select value={beds.toString()} onValueChange={(value) => setBeds(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="bathrooms">Bathrooms</Label>
            <Select value={baths.toString()} onValueChange={(value) => setBaths(parseInt(value))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <SelectItem key={num} value={num.toString()}>
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="sqft">Square Footage</Label>
          <Input
            id="sqft"
            type="number"
            value={sqft}
            onChange={(e) => setSqft(parseInt(e.target.value) || 0)}
            placeholder="Enter square footage"
            min="500"
            max="5000"
          />
        </div>

        {pricingResult && (
          <div className="mt-6 p-4 bg-gradient-hero rounded-lg">
            {pricingResult.isCustomQuote ? (
              <div className="text-center">
                <p className="text-lg font-semibold text-primary">Custom Quote Required</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Properties over 3,000 sq ft require a custom quote
                </p>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatCurrency(pricingResult.price * 100)}
                </p>
                <div className="mt-2 text-sm text-muted-foreground">
                  <p>Base Price: {formatCurrency(pricingResult.breakdown.basePrice * 100)}</p>
                  {pricingResult.breakdown.sqftSurcharge > 0 && (
                    <p>Size Surcharge: {formatCurrency(pricingResult.breakdown.sqftSurcharge * 100)}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}