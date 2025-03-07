import { CEvent, Event, Alert } from "@class/event";

const event: CEvent = new CEvent();

console.log(event);

event.setEvent(Event.NewHour, Alert.Major);
event.setEvent(Event.NewHigh, Alert.Nominal);
event.setEvent(Event.NewBoundary, Alert.Minor);
event.setEvent(Event.NewLow, Alert.Minor);
event.setEvent(Event.NewOutsideBar, Alert.Major);

console.log(event.eventText(Event.NewDay));
console.log(event.activeEvents());
