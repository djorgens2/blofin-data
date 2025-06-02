"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Candlestick = void 0;
const lightweight_charts_1 = require("lightweight-charts");
const chartProperties = {
    width: 1500,
    height: 600,
    timeScale: {
        timeVisible: true,
        secondsVisible: false,
    },
};
const Candlestick = (props) => {
    const { data, colors: { backgroundColor = "white", lineColor = "#2962FF", textColor = "black", areaTopColor = "#2962FF", areaBottomColor = "rgba(41, 98, 255, 0.28)", } = {}, } = props;
    const domElement = document.getElementById("tvchart");
    const chart = (0, lightweight_charts_1.createChart)(domElement, chartProperties);
    const series = chart.CandlestickSeries();
};
exports.Candlestick = Candlestick;
