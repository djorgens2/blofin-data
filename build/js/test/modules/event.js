"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const event_1 = require("@/class/event");
const event_2 = require("@/class/event");
console.log("Alert with type");
(0, event_2.SetEvent)(event_1.EventType.NewBreakout, event_1.AlertType.Minor);
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout, event_1.AlertType.Minor))
    console.log("Minor New Breakout is set");
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout))
    console.log("New Breakout is set");
(0, event_2.ClearEvents)();
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout, event_1.AlertType.Minor))
    console.log("Minor New Breakout is set");
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout))
    console.log("New Breakout is set");
console.log("Alert without type");
(0, event_2.SetEvent)(event_1.EventType.NewBreakout);
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout, event_1.AlertType.Minor))
    console.log("Minor New Breakout is set");
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout))
    console.log("New Breakout is set");
(0, event_2.ClearEvents)();
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout, event_1.AlertType.Minor))
    console.log("Minor New Breakout is set");
if ((0, event_2.IsEventSet)(event_1.EventType.NewBreakout))
    console.log("New Breakout is set");
