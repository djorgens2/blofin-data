import { Import } from "@api/candles";

import * as State from "@db/interfaces/state";
import * as Period from "@db/interfaces/period";
import * as Instruments from "@api/instruments";
import * as Candles from "@db/interfaces/candle";
import * as Periods from "@db/interfaces/instrument_period";
import * as Brokers from "@db/interfaces/broker";
import * as Roles from "@db/interfaces/role";

import { clear } from "./lib/app.util";

State.Import();
Period.Import();
Instruments.Import();
//Brokers.Import();
//Roles.Import();

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
    Import(ipc, { ...props, limit: db.bulk_collection_rate });
  });
}

importCandles();
