import { useState } from 'react';
import { useLocation } from '@/context/LocationContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { MapPin, Navigation, X, Check } from 'lucide-react';

export default function LocationSelector() {
  const { 
    userLocation, 
    locationName, 
    loading, 
    error,
    requestLocation, 
    setLocationByCity, 
    clearLocation,
    cities 
  } = useLocation();
  
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const handleSelectCity = (city) => {
    const success = setLocationByCity(city);
    if (success) {
      setOpen(false);
      setSearchValue('');
    }
  };

  const handleUseCurrentLocation = () => {
    requestLocation();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full gap-2"
          data-testid="location-selector"
        >
          <MapPin className="w-4 h-4" />
          {userLocation ? (
            <span className="max-w-32 truncate">{locationName || 'Location set'}</span>
          ) : (
            <span>Set Location</span>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Set Your Location
          </DialogTitle>
          <DialogDescription>
            See sellers and products nearest to you first
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Location Button */}
          <Button 
            variant="outline" 
            className="w-full justify-start gap-3"
            onClick={handleUseCurrentLocation}
            disabled={loading}
          >
            <Navigation className="w-5 h-5 text-blue-500" />
            <span className="flex-1 text-left">
              {loading ? 'Getting location...' : 'Use my current location'}
            </span>
            {loading && <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />}
          </Button>

          {error && (
            <p className="text-sm text-red-500 px-2">{error}</p>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or select a city
              </span>
            </div>
          </div>

          {/* City Search */}
          <Command className="border rounded-lg">
            <CommandInput 
              placeholder="Search cities..." 
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No city found.</CommandEmpty>
              <CommandGroup heading="Nigerian Cities">
                {cities
                  .filter(city => 
                    city.toLowerCase().includes(searchValue.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((city) => (
                    <CommandItem
                      key={city}
                      value={city}
                      onSelect={() => handleSelectCity(city)}
                      className="cursor-pointer"
                    >
                      <MapPin className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="capitalize">{city}</span>
                      {locationName?.toLowerCase() === city && (
                        <Check className="w-4 h-4 ml-auto text-primary" />
                      )}
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>

          {/* Current Selection */}
          {userLocation && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  <MapPin className="w-3 h-3 mr-1" />
                  {locationName || 'Location set'}
                </Badge>
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearLocation}
                className="text-muted-foreground hover:text-destructive"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
