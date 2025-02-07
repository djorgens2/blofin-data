"use strict";
//import * as currency from "./currency";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Publish = Publish;
exports.Import = Import;
;
;
function Publish(Instrument, Period, Candles) {
    if (Candles.length === 0)
        return;
    const instrument = Instrument.split("-");
    // instrument.forEach((symbol) => currency.Publish(symbol));
    // console.log(currency);
    //  console.log(instrument);
    //  console.log(Period);
    console.log(Candles);
    //  console.log(Candle.length);
}
;
function Import(Instrument, Period) {
    fetch(`https://openapi.blofin.com/api/v1/market/candles?instId=${Instrument}&limit=10&bars=${Period}`)
        .then(response => response.json())
        .then((result) => {
        const candles = result.data.map((field) => ({
            ts: parseInt(field[0]),
            open: parseFloat(field[1]),
            high: parseFloat(field[2]),
            low: parseFloat(field[3]),
            close: parseFloat(field[4]),
            vol: parseInt(field[5]),
            volCurrency: parseInt(field[6]),
            volCurrencyQuote: parseInt(field[7]),
            confirm: Boolean(field[8])
        }));
        Publish(Instrument, Period, candles);
    });
}
;
