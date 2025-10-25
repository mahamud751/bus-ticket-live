"use client";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronDown, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

interface City {
  code: string;
  name: string;
  country: string;
  state?: string;
}

interface AutoCompleteProps {
  value: string;
  onValueChange: (value: string) => void;
  cities: City[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CityAutoComplete({
  value,
  onValueChange,
  cities,
  placeholder = "Select city...",
  disabled = false,
  className,
}: AutoCompleteProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filter cities based on search
  const filteredCities = useMemo(() => {
    if (!searchValue) return cities;
    
    return cities.filter(
      (city) =>
        city.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        city.code.toLowerCase().includes(searchValue.toLowerCase())
    );
  }, [cities, searchValue]);

  // Get selected city details
  const selectedCity = cities.find((city) => city.code === value);

  const handleCitySelect = (cityCode: string) => {
    console.log('Selecting city:', cityCode);
    onValueChange(cityCode);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className={cn(
            "w-full justify-between h-12 px-4 text-left",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
            {selectedCity ? selectedCity.name : placeholder}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full min-w-[var(--radix-popover-trigger-width)] p-0" side="bottom" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search cities...`}
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-12"
          />
          <CommandEmpty>No city found.</CommandEmpty>
          <CommandGroup className="max-h-64 overflow-auto">
            {filteredCities.map((city) => (
              <div
                key={city.code}
                className="flex items-center justify-between py-3 px-2 cursor-pointer hover:bg-accent rounded-sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCitySelect(city.code);
                }}
              >
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                  <div>
                    <div className="font-medium">{city.name}</div>
                    {city.state && (
                      <div className="text-sm text-muted-foreground">{city.state}, {city.country}</div>
                    )}
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded font-mono mr-2">
                    {city.code}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === city.code ? "opacity-100" : "opacity-0"
                    )}
                  />
                </div>
              </div>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// Enhanced city data with more cities for better autocomplete experience
export const extendedCities: City[] = [
  { code: "DHK", name: "Dhaka", country: "Bangladesh", state: "Dhaka Division" },
  { code: "CTG", name: "Chittagong", country: "Bangladesh", state: "Chittagong Division" },
  { code: "SYL", name: "Sylhet", country: "Bangladesh", state: "Sylhet Division" },
  { code: "RAJ", name: "Rajshahi", country: "Bangladesh", state: "Rajshahi Division" },
  { code: "KHL", name: "Khulna", country: "Bangladesh", state: "Khulna Division" },
  { code: "BAR", name: "Barishal", country: "Bangladesh", state: "Barishal Division" },
  { code: "RAN", name: "Rangpur", country: "Bangladesh", state: "Rangpur Division" },
  { code: "MYM", name: "Mymensingh", country: "Bangladesh", state: "Mymensingh Division" },
  { code: "COM", name: "Comilla", country: "Bangladesh", state: "Chittagong Division" },
  { code: "COX", name: "Cox's Bazar", country: "Bangladesh", state: "Chittagong Division" },
  { code: "JES", name: "Jessore", country: "Bangladesh", state: "Khulna Division" },
  { code: "BOG", name: "Bogura", country: "Bangladesh", state: "Rajshahi Division" },
  { code: "DIN", name: "Dinajpur", country: "Bangladesh", state: "Rangpur Division" },
  { code: "NAR", name: "Narayanganj", country: "Bangladesh", state: "Dhaka Division" },
  { code: "GAZ", name: "Gazipur", country: "Bangladesh", state: "Dhaka Division" },
  { code: "TAN", name: "Tangail", country: "Bangladesh", state: "Dhaka Division" },
  { code: "FAR", name: "Faridpur", country: "Bangladesh", state: "Dhaka Division" },
  { code: "MAD", name: "Madaripur", country: "Bangladesh", state: "Dhaka Division" },
  { code: "SHE", name: "Sherpur", country: "Bangladesh", state: "Mymensingh Division" },
  { code: "NET", name: "Netrokona", country: "Bangladesh", state: "Mymensingh Division" },
];