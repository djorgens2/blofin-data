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

export type Alerts = keyof typeof Alert;
export type Events = keyof typeof Event;

export class CEvent {
  #Events: Array<boolean> = new Array(Object.keys(Event).length / 2).fill(false);
  #Alerts: Array<Alert> = new Array(Object.keys(Event).length / 2).fill(Alert.NoAlert);

  #MaxEvent: Event = Event.NoEvent;
  #MaxAlert: Alert = Alert.NoAlert;

  #EventText: string[];
  #AlertText: string[];

  //+------------------------------------------------------------------+
  //| Event constructor                                                |
  //+------------------------------------------------------------------+
  constructor() {
    let alert = Object.keys(Alert) as Alerts[];
    let event = Object.keys(Event) as Events[];

    this.#AlertText = alert.slice(alert.length / 2);
    this.#EventText = event.slice(event.length / 2);
  }

  //+------------------------------------------------------------------+
  //| set - Sets the triggering event and Alert level                  |
  //+------------------------------------------------------------------+
  set(event: Event, alert: Alert = Alert.Notify) {
    if (event === Event.NoEvent) return;

    this.#Events[Event.NoEvent] = false;
    this.#Events[event] = true;
    this.#Alerts[event] = <Alert>Math.max(alert, this.#Alerts[event]);

    if (alert > this.#MaxAlert) {
      this.#MaxEvent = event;
      this.#MaxAlert = alert;
    }

    alert === this.#MaxAlert && (this.#MaxEvent = <Event>Math.max(event, this.#MaxEvent));
  }

  //+------------------------------------------------------------------+
  //| clear - ResetsInitializes all events to false                    |
  //+------------------------------------------------------------------+
  clear() {
    this.#Events.fill(false);
    this.#Alerts.fill(Alert.NoAlert);

    this.#Events[Event.NoEvent] = true;

    this.#MaxEvent = Event.NoEvent;
    this.#MaxAlert = Alert.NoAlert;
  }

  //+------------------------------------------------------------------+
  //| isSet - Returns true on Event for provided Alert condition       |
  //+------------------------------------------------------------------+
  isSet(setEvent: Event, setAlert: Alert = Alert.NoAlert): boolean {
    if (setAlert === Alert.NoAlert) return this.#Events[setEvent];
    if (this.#Events[setEvent] && this.#Alerts[setEvent] === setAlert) return this.#Events[setEvent];

    return false;
  }

  //+------------------------------------------------------------------+
  //| maxEvent - Returns MaxEvent active from last clearEvent call     |
  //+------------------------------------------------------------------+
  maxEvent(): Event {
    return this.#MaxEvent;
  }

  //+------------------------------------------------------------------+
  //| maxAlert - Returns MaxAlert active from last clearEvent call     |
  //+------------------------------------------------------------------+
  maxAlert(): Alert {
    return this.#MaxAlert;
  }

  //+------------------------------------------------------------------+
  //| triggered - Returns true on any active event                     |
  //+------------------------------------------------------------------+
  triggered(): boolean {
    return !this.#Events[Event.NoEvent];
  }

  //+------------------------------------------------------------------+
  //| text - Returns translated literal event text(key)                |
  //+------------------------------------------------------------------+
  text(event: Event): string {
    return this.#EventText[event];
  }

  //+------------------------------------------------------------------+
  //| active - Returns an object of active {event, alert}              |
  //+------------------------------------------------------------------+
  active(): Array<{ event: string; alert: string }> {
    const activeEvents: Array<{ event: string; alert: string }> = [];

    if (this.triggered()) {
      this.#Events.forEach((active, row) => {
        if (active) {
          activeEvents.push({ event: this.#EventText[row], alert: this.#AlertText[this.#Alerts[row]] });
        }
      });

      return activeEvents;
    }
    return [{ event: "Inactive", alert: "None" }];
  }
}
