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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 w-fit border-border text-sm">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {format(dateRange.from, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateRange.from}
            onSelect={(d) => d && setDateRange({ ...dateRange, from: d })}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <span className="text-muted-foreground text-xs">até</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="gap-2 w-fit border-border text-sm">
            <CalendarIcon className="w-4 h-4 text-primary" />
            {format(dateRange.to, "dd/MM/yyyy")}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={dateRange.to}
            onSelect={(d) => d && setDateRange({ ...dateRange, to: d })}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default GlobalDateFilter;
