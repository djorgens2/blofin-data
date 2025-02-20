import * as periods from "./db/interfaces/period"
import * as instruments from "./api/instruments";
import * as candles from "./api/candles";

import { Analyze } from "./app/analyze";

periods.Import();
instruments.Import();
candles.Import();

Analyze();
