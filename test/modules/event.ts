import { EventType, AlertType } from "@/class/event";
import { SetEvent, ClearEvents, IsEventSet } from "@/class/event";

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
