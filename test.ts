import {Event, Alert} from '@app/event'
import {CEvent} from '@app/event'

const fractal = {
  event: new CEvent(),
}

fractal.event.isSet(Event.AdverseEvent) && (console.log("0:Yes it is!"));

fractal.event.clear();
fractal.event.set(Event.AdverseEvent, Alert.Critical);
fractal.event.isSet(Event.AdverseEvent) && (console.log("1:Yes it is!"));
fractal.event.isSet(Event.AdverseEvent, Alert.Critical) && (console.log("2:Yes it is!"));
fractal.event.isSet(Event.AdverseEvent, Alert.Nominal) && (console.log("3:Yes it is!"));

fractal.event.clear();
fractal.event.isSet(Event.AdverseEvent) && (console.log("4:Yes it is!"));

function scope() {
  fractal.event.isSet(Event.AdverseEvent) && (console.log("inner-0:Yes it is!"));

  fractal.event.clear();
  fractal.event.set(Event.AdverseEvent, Alert.Critical);
  fractal.event.isSet(Event.AdverseEvent) && (console.log("inner-1:Yes it is!"));
  fractal.event.isSet(Event.AdverseEvent, Alert.Critical) && (console.log("inner-2:Yes it is!"));
  fractal.event.isSet(Event.AdverseEvent, Alert.Nominal) && (console.log("inner-3:Yes it is!"));

  fractal.event.clear();
  fractal.event.isSet(Event.AdverseEvent) && (console.log("inner-4:Yes it is!"));

  fractal.event.set(Event.NewDay, Alert.Nominal);
  fractal.event.set(Event.NewHour, Alert.Major);
}

scope()

fractal.event.isSet(Event.AdverseEvent) && (console.log("after-1:Yes it is!"));
fractal.event.isSet(Event.NewDay) && (console.log('A glorious day it is!'))

console.log(fractal.event.maxAlert())
fractal.event.set(Event.NewDay, Alert.Critical);
console.log(fractal.event.maxAlert())