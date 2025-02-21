import { EventType, AlertType } from "./app/event";
import { SetEvent, ClearEvents, IsEventSet } from "./app/event";
import type { Direction, Action } from "./components/std.util";

console.log("Alert with type");
SetEvent(EventType.NewBreakout, AlertType.Minor);

if (IsEventSet(EventType.NewBreakout, AlertType.Minor)) console.log("Minor New Breakout is set");
if (IsEventSet(EventType.NewBreakout)) console.log("New Breakout is set");

ClearEvents();

if (IsEventSet(EventType.NewBreakout, AlertType.Minor)) console.log("Minor New Breakout is set");
if (IsEventSet(EventType.NewBreakout)) console.log("New Breakout is set");

console.log("Alert without type");
SetEvent(EventType.NewBreakout);

if (IsEventSet(EventType.NewBreakout, AlertType.Minor)) console.log("Minor New Breakout is set");
if (IsEventSet(EventType.NewBreakout)) console.log("New Breakout is set");

ClearEvents();

if (IsEventSet(EventType.NewBreakout, AlertType.Minor)) console.log("Minor New Breakout is set");
if (IsEventSet(EventType.NewBreakout)) console.log("New Breakout is set");
