import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useApp } from "@/contexts/AppContext";
import { cn } from "@/lib/utils";

const GlobalDateFilter = () => {
  const { dateRange, setDateRange } = useApp();

  const handleFromSelect = (d: Date | undefined) => {
    if (!d) return;
    if (d > dateRange.to) {
      setDateRange({ from: d, to: d });
    } else {
      setDateRange({ ...dateRange, from: d });
    }
  };

  const handleToSelect = (d: Date | undefined) => {
    if (!d) return;
    setDateRange({ ...dateRange, to: d });
  };

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 px-2.5 sm:px-3 h-9 sm:h-10 border-border text-xs sm:text-sm">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            {format(dateRange.from, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.from}
            onSelect={handleFromSelect}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground text-xs">até</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-1.5 px-2.5 sm:px-3 h-9 sm:h-10 border-border text-xs sm:text-sm">
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
            {format(dateRange.to, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateRange.to}
            onSelect={handleToSelect}
            disabled={(date) => date < dateRange.from}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default GlobalDateFilter;
