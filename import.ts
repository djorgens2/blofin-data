import * as TradeState from "@db/interfaces/trade_state";
import * as Period from "@/db/interfaces/period";
import * as Instruments from "@api/instruments";
import * as Candles from "@api/candles";

TradeState.Import();
Period.Import();
Instruments.Import();
Candles.BulkImport();
