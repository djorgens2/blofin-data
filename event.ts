import { Analyze } from "./app/analyze";
import {
  EventType as event,
  AlertType as alert,
  Event,
  Alert,
  MaxEvent,
  MaxAlert,
  SetEvent,
  ClearEvents,
} from "./app/event";

SetEvent(event.NewBreakout, alert.Minor);

console.log(Event);
console.log(Alert);

ClearEvents();

console.log(Event);
console.log(Alert);

Analyze();