import DateRangePicker from "@/components/DateRangePicker";
import { useApp } from "@/contexts/AppContext";

const GlobalDateFilter = () => {
  const { dateRange, setDateRange } = useApp();

  return (
    <DateRangePicker
      from={dateRange.from}
      to={dateRange.to}
      onChange={setDateRange}
    />
  );
};

export default GlobalDateFilter;
