import * as candles from "./api/candles";
import * as instruments from "./api/instruments";
import * as periods from "./db/interfaces/period"

periods.Import();
instruments.Import();
candles.Import();
