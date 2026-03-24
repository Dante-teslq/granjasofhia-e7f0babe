import { useState, useEffect } from "react";
import { format, isSameDay, isAfter, isBefore } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DayPicker, DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
  align?: "start" | "center" | "end";
  className?: string;
}

const DateRangePicker = ({ from, to, onChange, align = "end", className }: DateRangePickerProps) => {
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<{ from: Date; to?: Date }>({ from, to });
  const [clickCount, setClickCount] = useState(0);

  // Sync when props change externally
  useEffect(() => {
    if (!open) {
      setTempRange({ from, to });
      setClickCount(0);
    }
  }, [from, to, open]);

  const handleDayClick = (day: Date) => {
    if (clickCount === 0) {
      // First click: set start date
      setTempRange({ from: day, to: undefined });
      setClickCount(1);
    } else {
      // Second click: set end date (ensure from < to)
      if (isBefore(day, tempRange.from)) {
        setTempRange({ from: day, to: tempRange.from });
      } else {
        setTempRange({ from: tempRange.from, to: day });
      }
      setClickCount(2);
    }
  };

  const handleApply = () => {
    const finalTo = tempRange.to || tempRange.from;
    onChange({ from: tempRange.from, to: finalTo });
    setOpen(false);
    setClickCount(0);
  };

  const isSingleDay = isSameDay(from, to);
  const label = isSingleDay
    ? format(from, "dd/MM/yyyy")
    : `${format(from, "dd/MM/yyyy")} — ${format(to, "dd/MM/yyyy")}`;

  const today = new Date();

  // Build modifiers for styling
  const modifiers: Record<string, Date | Date[] | ((d: Date) => boolean)> = {
    today: today,
    rangeStart: tempRange.from,
  };

  if (tempRange.to && !isSameDay(tempRange.from, tempRange.to)) {
    modifiers.rangeEnd = tempRange.to;
    modifiers.inRange = (day: Date) =>
      isAfter(day, tempRange.from) && isBefore(day, tempRange.to!);
  }

  const modifiersClassNames: Record<string, string> = {
    today: "!bg-transparent !text-foreground ring-2 ring-primary ring-inset font-bold",
    rangeStart: "!bg-primary !text-primary-foreground hover:!bg-primary",
    rangeEnd: "!bg-primary !text-primary-foreground hover:!bg-primary",
    inRange: "!bg-primary/15 !text-foreground rounded-none",
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("gap-2 w-fit border-border text-sm", className)}>
          <CalendarIcon className="w-4 h-4 text-primary" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <div className="p-3 pointer-events-auto">
          <DayPicker
            mode="single"
            locale={ptBR}
            selected={undefined}
            onDayClick={handleDayClick}
            showOutsideDays
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="p-0"
            classNames={{
              months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "text-sm font-medium",
              nav: "space-x-1 flex items-center",
              nav_button: cn(
                buttonVariants({ variant: "outline" }),
                "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
              ),
              nav_button_previous: "absolute left-1",
              nav_button_next: "absolute right-1",
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
              day: cn(buttonVariants({ variant: "ghost" }), "h-9 w-9 p-0 font-normal aria-selected:opacity-100"),
              day_outside: "day-outside text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
            components={{
              IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
              IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
            }}
          />
          <div className="flex justify-end gap-2 border-t border-border pt-3 mt-2">
            <Button size="sm" variant="outline" onClick={() => { setTempRange({ from, to }); setClickCount(0); setOpen(false); }}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleApply}>
              Aplicar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default DateRangePicker;
