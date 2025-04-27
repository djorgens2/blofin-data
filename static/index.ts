"use strict"
"use client";

import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";


const chartProperties = {
    width: 1500,
    height: 600,
    timeScale: {
        timeVisible:true,
        secondsVisible: false,
    }}

    export const Candlestick = (props) => {
  const {
    data,
    colors: {
      backgroundColor = "white",
      lineColor = "#2962FF",
      textColor = "black",
      areaTopColor = "#2962FF",
      areaBottomColor = "rgba(41, 98, 255, 0.28)",
    } = {},
  } = props;
  
    const domElement = document.getElementById('tvchart')
    const chart = createChart(domElement!, chartProperties);
    const series = chart.CandlestickSeries();