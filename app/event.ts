//+------------------------------------------------------------------+
//|                                                         Event.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

export const Alert = {
  NoAlert: 0,
  Notify: 1,
  Nominal: 2,
  Warning: 3,
  Minor: 4,
  Major: 5,
  Critical: 6,
} as const;

export const Event = {
  NoEvent: 0,
  AdverseEvent: 1, //-- Very bad event
  NewHigh: 2,
  NewLow: 3,
  NewBoundary: 4,
  NewDirection: 5, //-- Directional change
  NewState: 6,
  NewBias: 7,
  NewTick: 8, //-- Tick level event; aggregate or trade
  NewSegment: 9, //-- Segment level event; aggregate of Ticks
  NewContraction: 10,
  NewFractal: 11, //-- Fractal Direction change
  NewFibonacci: 12, //-- Fibonacci Level change only
  NewOrigin: 13,
  NewTrend: 14,
  NewTerm: 15,
  NewLead: 16,
  NewExpansion: 17,
  NewDivergence: 18,
  NewConvergence: 19,
  NewRally: 20,
  NewPullback: 21,
  NewRetrace: 22,
  NewCorrection: 23,
  NewRecovery: 24,
  NewBreakout: 25,
  NewReversal: 26,
  NewExtension: 27,
  NewFlatline: 28,
  NewConsolidation: 29,
  NewParabolic: 30, //-- Expanding Multidirectional (parabolic) event
  NewChannel: 31,
  CrossCheck: 32,
  Exception: 33,
  SessionOpen: 34,
  SessionClose: 35,
  NewDay: 36,
  NewHour: 37,
} as const;

export type Alert = typeof Alert[keyof typeof Alert];
export type Event = typeof Event[keyof typeof Event];

export class CEvent {
  #Events: Array<boolean> = new Array(Object.keys(Event).length).fill(false);
  #Alerts: Array<Alert> = new Array(Object.keys(Event).length).fill(Alert.NoAlert);

  #MaxEvent: Event = Event.NoEvent;
  #MaxAlert: Alert = Alert.NoAlert;
  
  //+------------------------------------------------------------------+
  //| set - Sets the triggering event and Alert level                  |
  //+------------------------------------------------------------------+
  set(setEvent: Event, setAlert: Alert = Alert.Notify) {
  if (setEvent === Event.NoEvent) return;

    this.#Events[Event.NoEvent] = false;
    this.#Events[setEvent] = true;
    this.#Alerts[setEvent] = <Alert>Math.max(setAlert, this.#Alerts[setEvent]);

    if (setAlert > this.#MaxAlert) {
      this.#MaxEvent = setEvent;
      this.#MaxAlert = setAlert;
    }

    if (setAlert === this.#MaxAlert) this.#MaxEvent = <Event>Math.max(setEvent, this.#MaxEvent);
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
  isSet(setEvent: Event, setAlert:Alert = Alert.NoAlert): boolean {
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
  //| active - Returns true when any event is active                   |
  //+------------------------------------------------------------------+
  active(): boolean {
    return !this.#Events[Event.NoEvent];
  }
}
