//+------------------------------------------------------------------+
//|                                                         Event.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

export enum Alert {
  NoAlert,
  Notify,
  Nominal,
  Warning,
  Minor,
  Major,
  Critical,
}

export enum Event {
  NoEvent,
  AdverseEvent, //-- Very bad event
  NewHigh,
  NewLow,
  NewBoundary,
  NewOutsideBar,
  NewDirection, //-- Directional change
  NewState,
  NewBias,
  NewTick, //-- Tick level event; aggregate or trade
  NewSegment, //-- Segment level event; aggregate of Ticks
  NewContraction,
  NewFractal, //-- Fractal Direction change
  NewFibonacci, //-- Fibonacci Level change only
  NewOrigin,
  NewTrend,
  NewTerm,
  NewLead,
  NewExpansion,
  NewDivergence,
  NewConvergence,
  NewRally,
  NewPullback,
  NewRetrace,
  NewCorrection,
  NewRecovery,
  NewBreakout,
  NewReversal,
  NewExtension,
  NewFlatline,
  NewConsolidation,
  NewParabolic, //-- Expanding Multidirectional (parabolic) event
  NewChannel,
  CrossCheck,
  Exception,
  SessionOpen,
  SessionClose,
  NewDay,
  NewHour,
}

//+------------------------------------------------------------------+
//| Class CEvent: stores private Event stack with access methods     |
//+------------------------------------------------------------------+
export class CEvent {
  private Event: Array<boolean> = new Array(Object.keys(Event).length / 2).fill(false);
  private Alert: Array<Alert> = new Array(Object.keys(Event).length / 2).fill(Alert.NoAlert);

  private MaxEvent: Event = Event.NoEvent;
  private MaxAlert: Alert = Alert.NoAlert;

  private AlertText: string[];
  private EventText: string[];

  //+------------------------------------------------------------------+
  //| Event constructor                                                |
  //+------------------------------------------------------------------+
  constructor() {
    let alert = Object.keys(Alert) as Array<keyof typeof Alert>;
    let event = Object.keys(Event) as Array<keyof typeof Event>;

    this.AlertText = alert.slice(alert.length / 2);
    this.EventText = event.slice(event.length / 2);
  }

  //+------------------------------------------------------------------+
  //| setEvent - Sets the triggering event and Alert level             |
  //+------------------------------------------------------------------+
  setEvent(event: Event, alert: Alert = Alert.Notify) {
    if (event === Event.NoEvent) return;

    this.Event[Event.NoEvent] = false;
    this.Event[event] = true;
    this.Alert[event] = <Alert>Math.max(alert, this.Alert[event]);

    if (alert > this.MaxAlert) {
      this.MaxEvent = event;
      this.MaxAlert = alert;
    }

    alert === this.MaxAlert && (this.MaxEvent = <Event>Math.max(event, this.MaxEvent));
  }

  //+------------------------------------------------------------------+
  //| clearEvents - Resets/Initializes all events to false             |
  //+------------------------------------------------------------------+
  clearEvents() {
    this.Event.fill(false);
    this.Alert.fill(Alert.NoAlert);

    this.Event[Event.NoEvent] = true;

    this.MaxEvent = Event.NoEvent;
    this.MaxAlert = Alert.NoAlert;
  }

  //+------------------------------------------------------------------+
  //| isEventActive - Returns Event:Alert state of the provided Event  |
  //+------------------------------------------------------------------+
  isEventActive(setEvent: Event, setAlert: Alert = Alert.NoAlert): boolean {
    if (setAlert === Alert.NoAlert) return this.Event[setEvent];
    if (this.Event[setEvent] && this.Alert[setEvent] === setAlert) return this.Event[setEvent];

    return false;
  }

  //+------------------------------------------------------------------+
  //| isAnyEventActive - Returns true on any active event              |
  //+------------------------------------------------------------------+
  isAnyEventActive(): boolean {
    return !this.Event[Event.NoEvent];
  }

  //+------------------------------------------------------------------+
  //| maxEvent - Returns MaxEvent active from last clearEvent call     |
  //+------------------------------------------------------------------+
  maxEvent(): Event {
    return this.MaxEvent;
  }

  //+------------------------------------------------------------------+
  //| maxAlert - Returns MaxAlert active from last clearEvent call     |
  //+------------------------------------------------------------------+
  maxAlert(): Alert {
    return this.MaxAlert;
  }

  //+------------------------------------------------------------------+
  //| eventText - Returns translated literal event text(key)           |
  //+------------------------------------------------------------------+
  eventText(event: Event): string {
    return this.EventText[event];
  }

  //+------------------------------------------------------------------+
  //| alertText - Returns translated literal alert text(key)           |
  //+------------------------------------------------------------------+
  alertText(event: Event): string {
    return this.EventText[event];
  }

  //+------------------------------------------------------------------+
  //| activeEvents - Returns an object of active {event, alert}        |
  //+------------------------------------------------------------------+
  activeEvents(): Array<{ event: string; alert: string }> {
    const activeEvents: Array<{ event: string; alert: string }> = [];

    if (this.isAnyEventActive()) {
      this.Event.forEach((active, row) => {
        if (active) {
          activeEvents.push({ event: this.EventText[row], alert: this.AlertText[this.Alert[row]] });
        }
      });

      return activeEvents;
    }
    return [{ event: "Inactive", alert: "None" }];
  }
}
