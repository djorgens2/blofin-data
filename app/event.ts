//+------------------------------------------------------------------+
//|                                                         Event.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//|                                                                  |
//+------------------------------------------------------------------+

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

const NoValue: number = -1;

export const Event: Array<boolean> = new Array(EventType.Count).fill(false);
export const Alert: Array<AlertType> = new Array(EventType.Count).fill(
  AlertType.NoAlert
);
export let MaxEvent: EventType = EventType.NoEvent;
export let MaxAlert: AlertType = AlertType.NoAlert;

//+------------------------------------------------------------------+
//| SetEvent - Sets the triggering event to true                     |
//+------------------------------------------------------------------+
export function SetEvent(
  NewEvent: EventType,
  NewAlert: AlertType = AlertType.Notify
) {
  if (NewEvent === EventType.NoEvent) return;

  Event[EventType.NoEvent] = false;
  Event[NewEvent] = true;
  Alert[NewEvent] = Math.max(NewAlert, Alert[NewEvent]);

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
  Event.fill(false);
  Alert.fill(AlertType.NoAlert);

  Event[EventType.NoEvent] = true;

  MaxEvent = EventType.NoEvent;
  MaxAlert = AlertType.NoAlert;
}
