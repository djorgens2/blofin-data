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
  NewTick, //-- Tick event; change in close;
  NewBar, //-- Bar/Candle event; new timestamp;
  NewSegment, //-- Segment level event; aggregate of Ticks
  NewContraction,
  NewFractal, //-- Fractal Direction change
  NewFibonacci, //-- Fibonacci event
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
export const CEvent = () => {
  const AlertText: string[] = Object.keys(Alert).slice(Object.keys(Alert).length / 2);
  const EventText: string[] = Object.keys(Event).slice(Object.keys(Event).length / 2);

  const Events: Array<boolean> = new Array(EventText.length).fill(false);
  const Alerts: Array<Alert> = new Array(EventText.length).fill(Alert.NoAlert);

  let MaxEvent: Event = Event.NoEvent;
  let MaxAlert: Alert = Alert.NoAlert;

  //+------------------------------------------------------------------+
  //| set - Sets the triggering event and Alert level                  |
  //+------------------------------------------------------------------+
  const set = (event: Event, alert: Alert = Alert.Notify) => {
    if (event === Event.NoEvent) return;

    Events[Event.NoEvent] = false;
    Events[event] = true;
    Alerts[event] = <Alert>Math.max(alert, Alerts[event]);

    if (alert > MaxAlert) {
      MaxEvent = event;
      MaxAlert = alert;
    }

    alert === MaxAlert && (MaxEvent = <Event>Math.max(event, MaxEvent));
  };

  //+------------------------------------------------------------------+
  //| clear - Resets/Initializes all events to false                   |
  //+------------------------------------------------------------------+
  const clear = () => {
    Events.fill(false);
    Alerts.fill(Alert.NoAlert);

    Events[Event.NoEvent] = true;

    MaxEvent = Event.NoEvent;
    MaxAlert = Alert.NoAlert;
  };

  //+------------------------------------------------------------------+
  //| isActive - Returns Event:Alert state of the provided Event       |
  //+------------------------------------------------------------------+
  const isActive = (event: Event, alert: Alert = Alert.NoAlert): boolean => {
    if (alert === Alert.NoAlert) return Events[event];
    if (Events[event] && Alerts[event] === alert) return Events[event];

    return false;
  };

  //+------------------------------------------------------------------+
  //| isAnyActive - Returns true on any active event                   |
  //+------------------------------------------------------------------+
  const isAnyActive = (): boolean => {
    return !Events[Event.NoEvent];
  };

  //+------------------------------------------------------------------+
  //| active - Returns an object of active {event, alert}              |
  //+------------------------------------------------------------------+
  const active = (): Array<{ event: string; alert: string }> => {
    const activeEvents: Array<{ event: string; alert: string }> = [];

    if (isAnyActive()) {
      Events.forEach((active, row) => {
        active && activeEvents.push({ event: EventText[row], alert: AlertText[Alerts[row]] });
      });

      return activeEvents;
    }
    return [{ event: "Inactive", alert: "None" }];
  };

  //+------------------------------------------------------------------+
  //| maxEvent - Returns the Highest active event based on alert       |
  //+------------------------------------------------------------------+
  const maxEvent = (): Event => {
    return MaxEvent;
  };

  //+------------------------------------------------------------------+
  //| mxAlert - Returns the Highest active event based on alert        |
  //+------------------------------------------------------------------+
  const maxAlert = (): Alert => {
    return MaxAlert;
  };

  //+------------------------------------------------------------------+
  //| count - returns the count of active events;                      |
  //+------------------------------------------------------------------+
  const count = (): number => {
    let sum: number = 0;
    Events.forEach((event) => event && sum++);
    return sum;
  };

  //+------------------------------------------------------------------+
  //| eventText - Returns translated literal event text(key)           |
  //+------------------------------------------------------------------+
  const eventText = (event: Event): string => {
    return EventText[event];
  };

  //+------------------------------------------------------------------+
  //| alertText - Returns translated literal alert text(key)           |
  //+------------------------------------------------------------------+
  const alertText = (event: Event): string => {
    return EventText[event];
  };

  return { clear, set, isActive, isAnyActive, active, maxAlert, maxEvent, count, eventText, alertText };
};
