import * as candles from "./api/candles";
import * as instruments from "./api/instruments";
import * as periods from "./db/interfaces/period_type"

periods.Import();
instruments.Import();
candles.Import();
