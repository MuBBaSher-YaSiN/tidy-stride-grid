import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, CheckCircle, XCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function ICalTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const { toast } = useToast();

  const triggerICalPolling = async () => {
    setIsRunning(true);
    setLastResult(null);
    
    try {
      toast({
        title: "Triggering iCal Polling",
        description: "Starting to process iCal feeds and create jobs...",
      });

      const { data, error } = await supabase.functions.invoke('poll-ical-and-create-jobs', {
        body: { manual_trigger: true }
      });

      if (error) {
        console.error("Error calling edge function:", error);
        toast({
          title: "Error",
          description: "Failed to trigger iCal polling: " + error.message,
          variant: "destructive",
        });
        setLastResult({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
        return;
      }

      console.log("iCal polling result:", data);
      setLastResult({
        ...data,
        timestamp: new Date().toISOString()
      });

      if (data.success) {
        toast({
          title: "iCal Polling Completed!",
          description: `Processed ${data.bookingsProcessed || 0} bookings and created ${data.jobsCreated || 0} new jobs.`,
        });
      } else {
        toast({
          title: "iCal Polling Failed",
          description: data.error || "Unknown error occurred",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error triggering iCal polling:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while triggering iCal polling.",
        variant: "destructive",
      });
      setLastResult({ 
        success: false, 
        error: "Unexpected error occurred",
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Calendar className="w-5 h-5 mr-2" />
          iCal Integration Testing
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Manually trigger the iCal polling process to test job creation from Airbnb/VRBO calendar feeds.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <Button 
            onClick={triggerICalPolling} 
            disabled={isRunning}
            className="flex items-center"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            {isRunning ? "Processing..." : "Trigger iCal Polling"}
          </Button>
          
          {lastResult && (
            <Badge variant={lastResult.success ? "default" : "destructive"}>
              {lastResult.success ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <XCircle className="w-3 h-3 mr-1" />
              )}
              {lastResult.success ? "Success" : "Failed"}
            </Badge>
          )}
        </div>

        {lastResult && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Last Result ({new Date(lastResult.timestamp).toLocaleString()})</h4>
            
            {lastResult.success ? (
              <div className="space-y-2 text-sm">
                <p><strong>Bookings Processed:</strong> {lastResult.bookingsProcessed || 0}</p>
                <p><strong>Events Processed:</strong> {lastResult.eventsProcessed || 0}</p>
                <p><strong>Jobs Created:</strong> {lastResult.jobsCreated || 0}</p>
                
                {lastResult.bookingResults && lastResult.bookingResults.length > 0 && (
                  <div>
                    <p><strong>Booking Details:</strong></p>
                    <ul className="ml-4 list-disc space-y-1">
                      {lastResult.bookingResults.map((result: any, index: number) => (
                        <li key={index} className="text-xs">
                          Booking {result.bookingId?.slice(0, 8) || 'Unknown'}: 
                          {result.eventsProcessed || 0} events, 
                          {result.jobsCreated || 0} jobs created
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-destructive">
                <p><strong>Error:</strong> {lastResult.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="bg-blue-50 p-4 rounded-lg text-sm">
          <h4 className="font-medium mb-2">Testing Steps:</h4>
          <ol className="list-decimal list-inside space-y-1">
            <li>Make sure you have a booking with iCal URLs</li>
            <li>Click "Trigger iCal Polling" above</li>
            <li>Check the results to see if jobs were created</li>
            <li>Go to Job Management to see the new jobs</li>
            <li>Jobs will be created for checkout dates in the iCal feeds</li>
          </ol>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg text-sm">
          <h4 className="font-medium mb-2">Note:</h4>
          <p>
            This function normally runs automatically on a schedule. This manual trigger 
            is for testing purposes only. Jobs are created based on checkout events 
            found in the iCal feeds from Airbnb/VRBO bookings.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}