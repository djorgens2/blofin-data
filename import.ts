import { Import } from "@api/candles";
import { State } from "./db/interfaces/trade_state";

import * as TradeState from "@db/interfaces/trade_state";
import * as Period from "@db/interfaces/period";
import * as Instruments from "@api/instruments";
import * as Candles from "@db/interfaces/candle";
import * as Periods from "@db/interfaces/instrument_period";
import { clear } from "./lib/std.util";

TradeState.Import();
Period.Import();
Instruments.Import();

//-------------------------------- candles Import ---------------------------------------//
async function importCandles() {
  const instruments = await Periods.Fetch({ active_collection: true });
  console.log("Fetch filtered period:", instruments);
  
  instruments?.forEach((db, id) => {
    const ipc = clear({ state: "start", symbol: db.symbol!, node: id });
    const props: Candles.IKeyProps = {
      instrument: db.instrument!,
      symbol: db.symbol!,
      period: db.period!,
      timeframe: db.timeframe!,
    };
    Import(ipc, props, 1440);
  });
}

importCandles();
