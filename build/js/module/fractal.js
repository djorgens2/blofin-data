//+--------------------------------------------------------------------------------------+
//|                                                                           fractal.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.CFractal = void 0;
const event_1 = require("@module/event");
const app_util_1 = require("@lib/app.util"); //-- enums
const app_util_2 = require("@lib/app.util"); //-- functions
const std_util_1 = require("@lib/std.util");
const report_1 = require("@module/report");
const Candle = __importStar(require("@db/interfaces/candle"));
var State;
(function (State) {
    //----- Fractal States ----------------------------//
    State["NoState"] = "NoState";
    State["Root"] = "Root";
    State["Rally"] = "Rally";
    State["Pullback"] = "Pullback";
    State["Retrace"] = "Retrace";
    State["Correction"] = "Correction";
    State["Recovery"] = "Recovery";
    State["Breakout"] = "Breakout";
    State["Reversal"] = "Reversal";
    State["Extension"] = "Extension";
    //----- SMA States ----------------------------//
    State["Flatline"] = "Flatline";
    State["Consolidation"] = "Consolidation";
    State["Parabolic"] = "Parabolic";
    State["Channel"] = "Channel";
})(State || (State = {}));
var Percent;
(function (Percent) {
    Percent[Percent["Breakout"] = 1] = "Breakout";
    Percent[Percent["Correction"] = 0.764] = "Correction";
    Percent[Percent["Retracement"] = 0.5] = "Retracement";
    Percent[Percent["Consolidation"] = 0.234] = "Consolidation";
})(Percent || (Percent = {}));
const fibonacci = [
    { level: 0, percent: 0 },
    { level: 1, percent: 0.236 },
    { level: 2, percent: 0.382 },
    { level: 3, percent: 0.5 },
    { level: 4, percent: 0.618 },
    { level: 5, percent: 0.764 },
    { level: 6, percent: 1 },
    { level: 7, percent: 1.618 },
    { level: 8, percent: 2.618 },
    { level: 9, percent: 3.618 },
    { level: 10, percent: 4.236 },
    { level: 11, percent: 8.236 },
];
const fibonacciLevel = (percent) => {
    const level = { level: 0, percent: 0 };
    fibonacci
        .slice()
        .reverse()
        .some((seek) => {
        if ((0, std_util_1.format)(percent, 3) >= (0, std_util_1.format)(seek.percent, 3)) {
            Object.assign(level, seek);
            return true;
        }
    });
    return level;
};
const fibonacciPrice = (root, expansion, percent, digits) => {
    return (0, std_util_1.format)((expansion - root) * percent + root, digits);
};
//+--------------------------------------------------------------------------------------+
//| Module CFractal                                                                      |
//+--------------------------------------------------------------------------------------+
const CFractal = async (message, instrument) => {
    const event = (0, event_1.CEvent)();
    const Bar = {};
    const SMA = {};
    const Fractal = {};
    const props = {
        instrument: instrument.instrument,
        symbol: instrument.symbol,
        period: instrument.trade_period,
        timeframe: instrument.trade_timeframe,
    };
    const candles = await Candle.Fetch(Object.assign(Object.assign({}, props), { limit: 10000 })); //-- limit will be added to instrument
    const start = structuredClone(candles[candles.length - 1]);
    //-- Work variables -------------------------------------------------------//
    const bar = { min: start.low, max: start.high, retrace: start.close > start.open ? start.high : start.low };
    const sma = { open: 0, close: 0 };
    const price = [];
    //-- Properties -------------------------------------------------------------------------------//
    const periods = instrument.sma_factor;
    const digits = instrument.digits;
    //-- Utility functions ------------------------------------------------------------------------//
    //+--------------------------------------------------------------------------------------+
    //| lastProcessed returns the timestamp of the most recently processed completed bar;    |
    //+--------------------------------------------------------------------------------------+
    const lastProcessed = () => {
        return price.length > 1 ? price[price.length - 1].timestamp : 0;
    };
    //+--------------------------------------------------------------------------------------+
    //| iBar - Returns bar index for supplied timestamp                                      |
    //+--------------------------------------------------------------------------------------+
    function iBar(time) {
        let left = 0;
        let right = price.length - 1;
        while (left <= right) {
            const mid = Math.floor((left + right) / 2);
            if (price[mid].timestamp === time)
                return mid;
            price[mid].timestamp > time ? (left = mid + 1) : (right = mid - 1);
        }
        return -1;
    }
    //+--------------------------------------------------------------------------------------+
    //| iHigh - Returns highest IBar(obj) between provided bounds                            |
    //+--------------------------------------------------------------------------------------+
    function iHigh(timeStart, timeStop, includeStart = true) {
        let startBar = timeStart ? iBar(timeStart) : 0;
        const stopBar = timeStop ? iBar(timeStop) : price.length;
        const searchDir = (0, app_util_2.direction)(stopBar - startBar);
        !includeStart && (0, std_util_1.isBetween)(startBar, 0, price.length - 1) && (startBar += searchDir);
        let searchIndex = startBar;
        while (startBar !== stopBar) {
            price[startBar].high > price[searchIndex].high && (searchIndex = startBar);
            startBar += searchDir;
        }
        return { timestamp: price[searchIndex].timestamp, price: price[searchIndex].high };
    }
    //+--------------------------------------------------------------------------------------+
    //| iLow - Returns lowest IBar(obj) between provided bounds                              |
    //+--------------------------------------------------------------------------------------+
    function iLow(timeStart, timeStop, includeStart = true) {
        let startBar = timeStart ? iBar(timeStart) : 0;
        const stopBar = timeStop ? iBar(timeStop) : price.length;
        const searchDir = (0, app_util_2.direction)(stopBar - startBar);
        !includeStart && (0, std_util_1.isBetween)(startBar, 0, price.length - 1, false) && (startBar += searchDir);
        let searchIndex = startBar;
        while (startBar !== stopBar) {
            price[startBar].low < price[searchIndex].low && (searchIndex = startBar);
            startBar += searchDir;
        }
        return { timestamp: price[searchIndex].timestamp, price: price[searchIndex].low };
    }
    //+--------------------------------------------------------------------------------------+
    //| UpdateBar - Wraps up Bar processing                                                  |
    //+--------------------------------------------------------------------------------------+
    async function UpdateBar(candle) {
        event.clear();
        //--- set Bias
        if (Bar.open !== candle.close) {
            Bar.bias !== (0, app_util_2.bias)((0, app_util_2.direction)(candle.close - Bar.open)) && event.set(event_1.Event.NewBias, event_1.Alert.Notify);
            Bar.bias = (0, app_util_2.bias)((0, app_util_2.direction)(candle.close - Bar.open));
        }
        if (Bar.low > candle.low) {
            event.set(event_1.Event.NewLow, event_1.Alert.Notify);
            event.set(event_1.Event.NewBoundary, event_1.Alert.Notify);
        }
        if (Bar.high < candle.high) {
            event.set(event_1.Event.NewHigh, event_1.Alert.Notify);
            event.set(event_1.Event.NewBoundary, event_1.Alert.Notify);
        }
        if (event.isActive(event_1.Event.NewBoundary)) {
            //--- set Lead
            if (Bar.low > candle.low && Bar.high < candle.high) {
                event.set(event_1.Event.NewOutsideBar, event_1.Alert.Nominal);
            }
            else {
                if (Bar.low > candle.low) {
                    Bar.lead !== app_util_1.Bias.Short && event.set(event_1.Event.NewLead, event_1.Alert.Nominal);
                    Bar.lead = app_util_1.Bias.Short;
                    event.set(event_1.Event.NewLow, event_1.Alert.Nominal);
                    event.set(event_1.Event.NewBoundary, event_1.Alert.Nominal);
                }
                if (Bar.high < candle.high) {
                    Bar.lead !== app_util_1.Bias.Long && event.set(event_1.Event.NewLead, event_1.Alert.Nominal);
                    Bar.lead = app_util_1.Bias.Long;
                    event.set(event_1.Event.NewHigh, event_1.Alert.Nominal);
                    event.set(event_1.Event.NewBoundary, event_1.Alert.Nominal);
                }
            }
            //--- set Direction
            if (bar.min > candle.low && bar.max < candle.high) {
                event.set(event_1.Event.NewOutsideBar, event_1.Alert.Minor);
            }
            else {
                if (bar.min > candle.low) {
                    Bar.direction !== app_util_1.Direction.Down && event.set(event_1.Event.NewDirection, event_1.Alert.Minor);
                    Bar.direction = app_util_1.Direction.Down;
                    event.set(event_1.Event.NewBoundary, event_1.Alert.Minor);
                }
                if (bar.max < candle.high) {
                    Bar.direction !== app_util_1.Direction.Up && event.set(event_1.Event.NewDirection, event_1.Alert.Minor);
                    Bar.direction = app_util_1.Direction.Up;
                    event.set(event_1.Event.NewBoundary, event_1.Alert.Minor);
                }
            }
        }
        candle.completed && event.set(event_1.Event.NewBar);
        event.isActive(event_1.Event.NewBar) && (Bar.timestamp = candle.timestamp);
        event.isActive(event_1.Event.NewLead) && Bar.lead === app_util_1.Bias.Long
            ? ((bar.min = bar.retrace), (bar.retrace = candle.high))
            : ((bar.max = bar.retrace), (bar.retrace = candle.low));
        event.isActive(event_1.Event.NewHigh) && Bar.direction === app_util_1.Direction.Up && (bar.retrace = bar.max = candle.high);
        event.isActive(event_1.Event.NewLow) && Bar.direction === app_util_1.Direction.Down && (bar.retrace = bar.min = candle.low);
        Bar.open = candle.open;
        Bar.high = candle.high;
        Bar.low = candle.low;
        Bar.close = candle.close;
        Object.assign(report_1.report, { bar: { timestamp: Bar.timestamp, open: Bar.open, high: Bar.high, low: Bar.low, close: Bar.close } });
    }
    //+--------------------------------------------------------------------------------------+
    //| UpdateSMA - Computes SMA measures, trend detail, values                              |
    //+--------------------------------------------------------------------------------------+
    async function UpdateSMA() {
        if (event.isActive(event_1.Event.NewBar)) {
            sma.open += Bar.open;
            sma.close += Bar.close;
            price.push({ timestamp: Bar.timestamp, open: Bar.open, high: Bar.high, low: Bar.low, close: Bar.close });
            if (price.length > periods) {
                sma.open -= price[0].open;
                sma.close -= price[0].close;
                price.shift();
            }
            SMA.timestamp = Bar.timestamp;
            SMA.open = (0, std_util_1.format)(sma.open / Math.min(periods, price.length), digits + 1);
            SMA.close = (0, std_util_1.format)(sma.close / Math.min(periods, price.length), digits + 1);
        }
        else {
            SMA.close = (0, std_util_1.format)((sma.close - SMA.close + Bar.close) / Math.min(periods, price.length), digits + 1);
        }
        SMA.direction = app_util_1.Direction.None;
        SMA.lead = app_util_1.Bias.None;
        SMA.bias = app_util_1.Bias.None;
        SMA.high = 0;
        SMA.low = 0;
        Object.assign(report_1.report, { sma: { open: SMA.open, close: SMA.close } });
    }
    //+--------------------------------------------------------------------------------------+
    //| UpdateFractal - completes fractal calcs                                              |
    //+--------------------------------------------------------------------------------------+
    async function UpdateFractal() {
        const resistance = iHigh();
        const support = iLow();
        const close = { timestamp: Bar.timestamp, price: Bar.close };
        const rangeDirection = close.price < Fractal.support.price ? app_util_1.Direction.Down : close.price > Fractal.resistance.price ? app_util_1.Direction.Up : app_util_1.Direction.None;
        //--- Handle Reversals
        if ((0, app_util_1.directionChanged)(Fractal.direction, rangeDirection)) {
            Fractal.direction = rangeDirection;
            Fractal.point.base = Fractal.direction === app_util_1.Direction.Up ? Fractal.resistance : Fractal.support;
            Fractal.point.root = Fractal.point.expansion;
            Fractal.point.origin = Fractal.point.root;
            Object.assign(report_1.report, { fractal: Fractal.point.root });
            event.set(event_1.Event.NewReversal, event_1.Alert.Major);
        }
        //--- Check for Upper Boundary changes
        if (Fractal.direction === app_util_1.Direction.Up)
            if ((0, std_util_1.isHigher)(Bar.high, Fractal.point.expansion.price, digits)) {
                Fractal.extension.price = Fractal.point.expansion.price; // -- store prior value for fibo calc
                Fractal.point.expansion = { timestamp: Bar.timestamp, price: Bar.high };
                Fractal.point.retrace = close;
                Fractal.point.recovery = close;
                event.set(event_1.Event.NewExpansion, event_1.Alert.Minor);
            }
            else if (event.isActive(event_1.Event.NewBoundary)) {
                if (event.isActive(event_1.Event.NewLow)) {
                    if (Fractal.point.retrace.price > Bar.low) {
                        Fractal.point.retrace = { timestamp: Bar.timestamp, price: Bar.low };
                        Fractal.point.recovery = close;
                    }
                }
                if (event.isActive(event_1.Event.NewHigh))
                    Fractal.point.recovery.price < Bar.high && (Fractal.point.recovery = { timestamp: Bar.timestamp, price: Bar.high });
            }
            else {
                Fractal.point.recovery.price < Bar.close && (Fractal.point.recovery = close);
                Fractal.point.retrace.price > Bar.close && (Fractal.point.retrace = close);
            }
        //--- Check for Lower Boundary changes
        else if ((0, std_util_1.isLower)(Bar.low, Fractal.point.expansion.price, digits)) {
            Fractal.extension.price = Fractal.point.expansion.price; // -- store prior value for fibo calc
            Fractal.point.expansion = { timestamp: Bar.timestamp, price: Bar.low };
            Fractal.point.retrace = close;
            Fractal.point.recovery = close;
            event.set(event_1.Event.NewExpansion, event_1.Alert.Minor);
        }
        else if (event.isActive(event_1.Event.NewHigh)) {
            if (Fractal.point.retrace.price < Bar.high) {
                Fractal.point.retrace = { timestamp: Bar.timestamp, price: Bar.high };
                Fractal.point.recovery = close;
            }
        }
        else if (event.isActive(event_1.Event.NewLow))
            Fractal.point.recovery.price > Bar.low && (Fractal.point.recovery = { timestamp: Bar.timestamp, price: Bar.low });
        else {
            Fractal.point.recovery.price > Bar.close && (Fractal.point.recovery = close);
            Fractal.point.retrace.price < Bar.close && (Fractal.point.retrace = close);
        }
        //-- wrap-up tasks
        (0, std_util_1.isLower)(resistance.price - support.price, Fractal.range) && event.set(event_1.Event.NewConsolidation, event_1.Alert.Nominal);
        Fractal.range = (0, std_util_1.format)(resistance.price - support.price, digits);
        Fractal.point.close = close;
        Fractal.support = support;
        Fractal.resistance = resistance;
    }
    //+--------------------------------------------------------------------------------------+
    //| Fibonacci - Returns Calculated fibonacci %sequence's for the active Fractal          |
    //+--------------------------------------------------------------------------------------+
    function Fibonacci() {
        const recovery = Fractal.point.recovery.timestamp > 0 ? Fractal.point.recovery.price : Fractal.point.retrace.price;
        return {
            retrace: {
                min: (0, std_util_1.format)(1 - (Fractal.point.root.price - recovery) / (Fractal.point.root.price - Fractal.point.expansion.price), 3),
                max: (0, std_util_1.format)(1 - (Fractal.point.root.price - Fractal.point.retrace.price) / (Fractal.point.root.price - Fractal.point.expansion.price), 3),
                now: (0, std_util_1.format)(1 - (Fractal.point.root.price - Bar.close) / (Fractal.point.root.price - Fractal.point.expansion.price), 3),
            },
            extension: {
                min: (0, std_util_1.format)((Fractal.point.root.price - Fractal.point.retrace.price) / (Fractal.point.root.price - Fractal.point.base.price), 3),
                max: (0, std_util_1.format)((Fractal.point.root.price - Fractal.point.expansion.price) / (Fractal.point.root.price - Fractal.point.base.price), 3),
                now: (0, std_util_1.format)((Fractal.point.root.price - Bar.close) / (Fractal.point.root.price - Fractal.point.base.price), 3),
            },
        };
    }
    //+--------------------------------------------------------------------------------------+
    //| UpdateFibonacci - Updates Fractal state, properties, events                          |
    //+--------------------------------------------------------------------------------------+
    async function UpdateFibonacci() {
        var _a;
        const percent = Fibonacci();
        if (event.isActive(event_1.Event.NewExpansion)) {
            //-- Handle New Reversal
            if (event.isActive(event_1.Event.NewReversal)) {
                Fractal.state = State.Reversal;
                Fractal.extension = Object.assign(Object.assign({ timestamp: Bar.timestamp, price: Fractal.point.base.price }, fibonacciLevel(Percent.Breakout)), { event: event_1.Event.NewReversal });
                Object.assign(report_1.report, { breakout: { timestamp: Bar.timestamp, price: Fractal.point.base.price } });
            }
            //-- Handle New Breakout
            else if (Fractal.retrace.level) {
                Fractal.state = State.Breakout;
                Fractal.extension = Object.assign(Object.assign({}, Fractal.extension), { timestamp: Bar.timestamp, event: event_1.Event.NewBreakout });
                Object.assign(report_1.report, { breakout: { timestamp: Bar.timestamp, price: Fractal.extension.price } });
                event.set(event_1.Event.NewBreakout, event_1.Alert.Major);
            }
            //-- Handle New Extension
            while ((0, std_util_1.isHigher)(fibonacciLevel(percent.extension.max).level, Fractal.extension.level, 3)) {
                Fractal.state = State.Extension;
                Fractal.extension = {
                    timestamp: Bar.timestamp,
                    price: fibonacciPrice(Fractal.point.root.price, Fractal.point.base.price, fibonacci[++Fractal.extension.level].percent, digits),
                    level: Fractal.extension.level,
                    percent: fibonacci[Fractal.extension.level].percent,
                    event: event_1.Event.NewExtension,
                };
                report_1.report.extension.push(Fractal.extension);
                event.set(event_1.Event.NewExtension, event_1.Alert.Minor);
            }
            Fractal.retrace = {
                timestamp: Bar.timestamp,
                price: (_a = Fractal.point) === null || _a === void 0 ? void 0 : _a.expansion.price,
                level: 0,
                percent: 0,
                event: event_1.Event.NewExtension,
            };
        }
        //-- Handle Retrace
        while ((0, std_util_1.isHigher)(fibonacciLevel(percent.retrace.max).level, Fractal.retrace.level, 3)) {
            const retrace = {
                timestamp: Bar.timestamp,
                price: fibonacciPrice(Fractal.point.expansion.price, Fractal.point.root.price, ++Fractal.retrace.level, digits),
                level: Fractal.retrace.level,
                percent: fibonacci[Fractal.retrace.level].percent,
                event: event_1.Event.NoEvent,
            };
            if (percent.retrace.max >= Percent.Correction) {
                if (percent.retrace.min < Percent.Consolidation) {
                    Fractal.state = State.Recovery;
                    Fractal.retrace = Object.assign(Object.assign({}, retrace), { event: event_1.Event.NewRecovery });
                    event.set(event_1.Event.NewRecovery, event_1.Alert.Major);
                }
                else {
                    Fractal.state = State.Correction;
                    Fractal.retrace = Object.assign(Object.assign({}, retrace), { event: event_1.Event.NewCorrection });
                    event.set(event_1.Event.NewCorrection, event_1.Alert.Major);
                }
            }
            else if (percent.retrace.max >= Percent.Retracement) {
                Fractal.state = State.Retrace;
                Fractal.retrace = Object.assign(Object.assign({}, retrace), { event: event_1.Event.NewRetrace });
                event.set(event_1.Event.NewRetrace, event_1.Alert.Minor);
            }
            else if (percent.retrace.max >= Percent.Consolidation) {
                Fractal.retrace = Object.assign(Object.assign({}, retrace), { event: Fractal.direction === app_util_1.Direction.Up ? event_1.Event.NewPullback : event_1.Event.NewRally });
                event.set(Fractal.retrace.event, event_1.Alert.Nominal);
            }
            report_1.report.retracement.push(Fractal.retrace);
        }
    }
    //+--------------------------------------------------------------------------------------+
    //| Main Update loop; processes bar, sma, fractal, events                                |
    //+--------------------------------------------------------------------------------------+
    const Update = async (message) => {
        const candles = await Candle.Fetch(Object.assign(Object.assign({}, props), { timestamp: lastProcessed() }));
        async function updating(candle) {
            const bar = await UpdateBar(candle);
            const sma = await UpdateSMA();
            const fractal = await UpdateFractal();
            const fibonacci = await UpdateFibonacci();
            Object.assign(message, Object.assign({}, message));
        }
        async function processing() {
            for (let candle = candles.length - 1; candle >= 0; candle--) {
                await updating(candles[candle]);
                candles[candle].completed && (0, report_1.UpdateReport)();
            }
        }
        async function start() {
            await processing();
            event.isActive(event_1.Event.NewBar) && (0, report_1.PublishReport)("./log/" + props.symbol + ".process.log");
            process.send && process.send(Object.assign(Object.assign({}, message), { events: { fractal: event.count(), sma: 0 } }));
        }
        start();
    };
    //-- initialization Section --------------------------------------------------------------//
    Object.assign(Bar, {
        timestamp: start.timestamp,
        direction: (0, app_util_2.direction)(start.close - start.open),
        lead: (0, app_util_2.bias)((0, app_util_2.direction)(start.close - start.open)),
        bias: (0, app_util_2.bias)((0, app_util_2.direction)(start.close - start.open)),
        open: start.open,
        high: start.high,
        low: start.low,
        close: start.close,
    });
    Object.assign(SMA, Bar);
    Object.assign(Fractal, {
        direction: Bar.direction,
        lead: Bar.lead,
        bias: Bar.bias,
        range: (0, std_util_1.format)(Bar.high - Bar.low, digits),
        state: State.Breakout,
        point: {
            origin: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.direction === app_util_1.Direction.Up ? Bar.low : Bar.high, digits) },
            base: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.direction === app_util_1.Direction.Up ? Bar.high : Bar.low, digits) },
            root: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.direction === app_util_1.Direction.Up ? Bar.low : Bar.high, digits) },
            expansion: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.direction === app_util_1.Direction.Up ? Bar.high : Bar.low, digits) },
            retrace: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.open, digits) },
            recovery: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.close, digits) },
            close: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.close, digits) },
        },
        extension: { event: event_1.Event.NoEvent, price: 0.0, level: 0, percent: 0.0 },
        retrace: { event: event_1.Event.NoEvent, price: 0.0, level: 0, percent: 0.0 },
        support: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.low, digits) },
        resistance: { timestamp: Bar.timestamp, price: (0, std_util_1.format)(Bar.high, digits) },
    });
    return { Update, active: event.active, isAnyActive: event.isAnyActive };
};
exports.CFractal = CFractal;
