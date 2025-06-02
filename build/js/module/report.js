//+--------------------------------------------------------------------------------------+
//|                                                                            report.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublishReport = exports.UpdateReport = exports.report = void 0;
const std_util_1 = require("@lib/std.util");
//+---------------------------- Variable declarations -----------------------------------------------+
const log = [];
const empty = {
    bar: { timestamp: 0, open: 0, high: 0, low: 0, close: 0 },
    sma: { open: 0, close: 0 },
    fractal: { timestamp: 0, price: 0 },
    breakout: { timestamp: 0, price: 0 },
    extension: [],
    retracement: [],
};
exports.report = structuredClone(empty);
//+--------------------------------------------------------------------------------------+
//| Stores the final tick values and other pertinent details until Publisher is called;  |
//+--------------------------------------------------------------------------------------+
const UpdateReport = () => {
    log.push({
        bar: { timestamp: exports.report.bar.timestamp, open: exports.report.bar.open, high: exports.report.bar.high, low: exports.report.bar.low, close: exports.report.bar.close },
        sma: { open: exports.report.sma.open, close: exports.report.sma.close },
        fractal: { timestamp: exports.report.fractal.timestamp, price: exports.report.fractal.price },
        breakout: { timestamp: exports.report.breakout.timestamp, price: exports.report.breakout.price },
        extension: structuredClone(exports.report.extension),
        retracement: structuredClone(exports.report.retracement),
    });
    Object.assign(exports.report, Object.assign({}, empty));
    exports.report.extension.length = 0;
    exports.report.retracement.length = 0;
};
exports.UpdateReport = UpdateReport;
//+--------------------------------------------------------------------------------------+
//| Publishes (prints) the report array in its entirety; resets report for next edition; |
//+--------------------------------------------------------------------------------------+
const PublishReport = (fname = "report.log") => {
    //-- format csv line
    const array = [];
    log.map((log) => {
        const line = [
            log.bar.timestamp,
            log.bar.open,
            log.bar.high,
            log.bar.low,
            log.bar.close,
            log.sma.open,
            log.sma.close,
            log.fractal.timestamp ? log.fractal.timestamp : "=na()",
            log.fractal.price ? log.fractal.price : "=na()",
            log.breakout.timestamp ? log.breakout.timestamp : "=na()",
            log.breakout.price ? log.breakout.price : "=na()",
        ];
        const ext = log.extension.map((log) => (log.timestamp ? [log.percent, log.price] : ["=na()", "=na()"]));
        const ret = log.retracement.map((log) => (log.timestamp ? [log.percent, log.price] : ["=na()", "=na()"]));
        /*@ts-ignore */
        array.push(line.concat(ext, ret));
    });
    //-- write report
    (0, std_util_1.fileWrite)(fname, array);
};
exports.PublishReport = PublishReport;
