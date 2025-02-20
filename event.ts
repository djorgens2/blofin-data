import {
  EventType as et,
  AlertType as at,
  Event,
  Alert,
  MaxEvent,
  MaxAlert,
  SetEvent,
  ClearEvents,
} from "./app/event";

SetEvent(et.NewBreakout, at.Minor);

console.log(Event);
console.log(Alert);

ClearEvents();

console.log(Event);
console.log(Alert);
