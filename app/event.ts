//+------------------------------------------------------------------+
//|                                                         Event.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";

export enum AlertType {
  NoAlert,
  Notify,
  Nominal,
  Warning,
  Minor,
  Major,
  Critical,
  Count,
}

export enum EventType {
  NoEvent,
  AdverseEvent, //-- Very bad event
  NewHigh,
  NewLow,
  NewBoundary,
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
  NewParabolic, //-- Expanding, Multidirectional (parabolic) event
  NewChannel,
  CrossCheck,
  Exception,
  SessionOpen,
  SessionClose,
  NewDay,
  NewHour,
  Count,
}

const Events: Array<boolean> = new Array(EventType.Count).fill(false);
const Alerts: Array<AlertType> = new Array(EventType.Count).fill(AlertType.NoAlert);

let MaxEvent: EventType = EventType.NoEvent;
let MaxAlert: AlertType = AlertType.NoAlert;

//+------------------------------------------------------------------+
//| SetEvent - Sets the triggering event to true                     |
//+------------------------------------------------------------------+
export function SetEvent(NewEvent: EventType, NewAlert: AlertType = AlertType.Notify) {
  if (NewEvent === EventType.NoEvent) return;

  Events[EventType.NoEvent] = false;
  Events[NewEvent] = true;
  Alerts[NewEvent] = Math.max(NewAlert, Alerts[NewEvent]);

  if (NewAlert > MaxAlert) {
    MaxEvent = NewEvent;
    MaxAlert = NewAlert;
  }

  if (NewAlert === MaxAlert) MaxEvent = Math.max(NewEvent, MaxEvent);
}

//+------------------------------------------------------------------+
//| ClearEvents - Initializes all events to false                    |
//+------------------------------------------------------------------+
export function ClearEvents() {
  Events.fill(false);
  Alerts.fill(AlertType.NoAlert);

  Events[EventType.NoEvent] = true;

  MaxEvent = EventType.NoEvent;
  MaxAlert = AlertType.NoAlert;
}

//+------------------------------------------------------------------+
//| IsEventSet - Returns true on Event on provided Alert or NoAlert  |
//+------------------------------------------------------------------+
export function IsEventSet(Event: EventType, Alert: AlertType = AlertType.NoAlert): boolean {
  if (Alert === AlertType.NoAlert) return Events[Event];

  if (Events[Event] && Alerts[Event] === Alert) return Events[Event];

  return false;
}
