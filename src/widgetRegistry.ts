import ClockWidget from "./widgets/ClockWidget";
import WeatherWidget from "./widgets/WeatherWidget";
import CalendarWidget from "./widgets/CalendarWidget";
import GoldWidget from "./widgets/GoldWidget";

export const widgetRegistry = {
  clock: ClockWidget,
  weather: WeatherWidget,
  calendar: CalendarWidget,
  gold: GoldWidget
};