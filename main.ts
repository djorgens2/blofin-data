import * as Period from "@db/interfaces/period"
import * as Instruments from "@api/instruments";
import * as Candles from "@api/candles";

import { ProcessUpdates } from "@/app/process";

Period.Import();
Instruments.Import();
Candles.Import();

ProcessUpdates();
