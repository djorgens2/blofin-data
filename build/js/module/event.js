//+------------------------------------------------------------------+
//|                                                         Event.ts |
//|                                 Copyright 2018, Dennis Jorgenson |
//+------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CEvent = exports.Event = exports.Alert = void 0;
var Alert;
(function (Alert) {
    Alert[Alert["NoAlert"] = 0] = "NoAlert";
    Alert[Alert["Notify"] = 1] = "Notify";
    Alert[Alert["Nominal"] = 2] = "Nominal";
    Alert[Alert["Warning"] = 3] = "Warning";
    Alert[Alert["Minor"] = 4] = "Minor";
    Alert[Alert["Major"] = 5] = "Major";
    Alert[Alert["Critical"] = 6] = "Critical";
})(Alert || (exports.Alert = Alert = {}));
var Event;
(function (Event) {
    Event[Event["NoEvent"] = 0] = "NoEvent";
    Event[Event["AdverseEvent"] = 1] = "AdverseEvent";
    Event[Event["NewHigh"] = 2] = "NewHigh";
    Event[Event["NewLow"] = 3] = "NewLow";
    Event[Event["NewBoundary"] = 4] = "NewBoundary";
    Event[Event["NewOutsideBar"] = 5] = "NewOutsideBar";
    Event[Event["NewDirection"] = 6] = "NewDirection";
    Event[Event["NewState"] = 7] = "NewState";
    Event[Event["NewBias"] = 8] = "NewBias";
    Event[Event["NewTick"] = 9] = "NewTick";
    Event[Event["NewBar"] = 10] = "NewBar";
    Event[Event["NewSegment"] = 11] = "NewSegment";
    Event[Event["NewContraction"] = 12] = "NewContraction";
    Event[Event["NewFractal"] = 13] = "NewFractal";
    Event[Event["NewFibonacci"] = 14] = "NewFibonacci";
    Event[Event["NewOrigin"] = 15] = "NewOrigin";
    Event[Event["NewTrend"] = 16] = "NewTrend";
    Event[Event["NewTerm"] = 17] = "NewTerm";
    Event[Event["NewLead"] = 18] = "NewLead";
    Event[Event["NewExpansion"] = 19] = "NewExpansion";
    Event[Event["NewDivergence"] = 20] = "NewDivergence";
    Event[Event["NewConvergence"] = 21] = "NewConvergence";
    Event[Event["NewRally"] = 22] = "NewRally";
    Event[Event["NewPullback"] = 23] = "NewPullback";
    Event[Event["NewRetrace"] = 24] = "NewRetrace";
    Event[Event["NewCorrection"] = 25] = "NewCorrection";
    Event[Event["NewRecovery"] = 26] = "NewRecovery";
    Event[Event["NewBreakout"] = 27] = "NewBreakout";
    Event[Event["NewReversal"] = 28] = "NewReversal";
    Event[Event["NewExtension"] = 29] = "NewExtension";
    Event[Event["NewFlatline"] = 30] = "NewFlatline";
    Event[Event["NewConsolidation"] = 31] = "NewConsolidation";
    Event[Event["NewParabolic"] = 32] = "NewParabolic";
    Event[Event["NewChannel"] = 33] = "NewChannel";
    Event[Event["CrossCheck"] = 34] = "CrossCheck";
    Event[Event["Exception"] = 35] = "Exception";
    Event[Event["SessionOpen"] = 36] = "SessionOpen";
    Event[Event["SessionClose"] = 37] = "SessionClose";
    Event[Event["NewDay"] = 38] = "NewDay";
    Event[Event["NewHour"] = 39] = "NewHour";
})(Event || (exports.Event = Event = {}));
//+------------------------------------------------------------------+
//| Class CEvent: stores private Event stack with access methods     |
//+------------------------------------------------------------------+
const CEvent = () => {
    const AlertText = Object.keys(Alert).slice(Object.keys(Alert).length / 2);
    const EventText = Object.keys(Event).slice(Object.keys(Event).length / 2);
    const Events = new Array(EventText.length).fill(false);
    const Alerts = new Array(EventText.length).fill(Alert.NoAlert);
    let MaxEvent = Event.NoEvent;
    let MaxAlert = Alert.NoAlert;
    //+------------------------------------------------------------------+
    //| set - Sets the triggering event and Alert level                  |
    //+------------------------------------------------------------------+
    const set = (event, alert = Alert.Notify) => {
        if (event === Event.NoEvent)
            return;
        Events[Event.NoEvent] = false;
        Events[event] = true;
        Alerts[event] = Math.max(alert, Alerts[event]);
        if (alert > MaxAlert) {
            MaxEvent = event;
            MaxAlert = alert;
        }
        alert === MaxAlert && (MaxEvent = Math.max(event, MaxEvent));
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
    const isActive = (event, alert = Alert.NoAlert) => {
        if (alert === Alert.NoAlert)
            return Events[event];
        if (Events[event] && Alerts[event] === alert)
            return Events[event];
        return false;
    };
    //+------------------------------------------------------------------+
    //| isAnyActive - Returns true on any active event                   |
    //+------------------------------------------------------------------+
    const isAnyActive = () => {
        return !Events[Event.NoEvent];
    };
    //+------------------------------------------------------------------+
    //| active - Returns an object of active {event, alert}              |
    //+------------------------------------------------------------------+
    const active = () => {
        const activeEvents = [];
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
    const maxEvent = () => {
        return MaxEvent;
    };
    //+------------------------------------------------------------------+
    //| mxAlert - Returns the Highest active event based on alert        |
    //+------------------------------------------------------------------+
    const maxAlert = () => {
        return MaxAlert;
    };
    //+------------------------------------------------------------------+
    //| count - returns the count of active events;                      |
    //+------------------------------------------------------------------+
    const count = () => {
        let sum = 0;
        Events.forEach((event) => event && sum++);
        return sum;
    };
    //+------------------------------------------------------------------+
    //| eventText - Returns translated literal event text(key)           |
    //+------------------------------------------------------------------+
    const eventText = (event) => {
        return EventText[event];
    };
    //+------------------------------------------------------------------+
    //| alertText - Returns translated literal alert text(key)           |
    //+------------------------------------------------------------------+
    const alertText = (event) => {
        return EventText[event];
    };
    return { clear, set, isActive, isAnyActive, active, maxAlert, maxEvent, count, eventText, alertText };
};
exports.CEvent = CEvent;
