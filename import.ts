import { Import } from "@api/candles";
import { State } from "./db/interfaces/trade_state";

import * as TradeState from "@db/interfaces/trade_state";
import * as Period from "@db/interfaces/period";
import * as Instruments from "@api/instruments";
import * as Candles from "@db/interfaces/candle";
import * as Periods from "@db/interfaces/instrument_period"

TradeState.Import();
Period.Import();
Instruments.Import();

//-------------------------------- candles Import ---------------------------------------//
async function importCandles() {
  const instruments = await Periods.Fetch({activeCollection: true});
  console.log("Fetch filtered period:", instruments);

  instruments?.forEach ((db) => {
    const props: Candles.IKeyProps = {
      instrument: db.instrument!,
      symbol: db.symbol!,
      period: db.period!,
      timeframe: db.timeframe!,
    };
    Import(props, 1440);
  })
}

importCandles();
