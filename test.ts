import { CEvent, Event, Alert } from "@app/event"

const event: CEvent = new CEvent;

event.set(Event.NewHour, Alert.Major)
event.set(Event.NewHigh, Alert.Nominal)
event.set(Event.NewBoundary, Alert.Minor)
event.set(Event.NewLow, Alert.Minor)
event.set(Event.NewOutsideBar, Alert.Major)
console.log(event.text(Event.NewDay));
console.log(event.active());