import { Import } from "@api/candles";

import * as State from "@db/interfaces/state";
import * as Period from "@db/interfaces/period";
import * as Instruments from "@api/instruments";
import * as Candles from "@db/interfaces/candle";
import * as Periods from "@db/interfaces/instrument_period";
import * as InstrumentPosition from "@db/interfaces/instrument_position";
import * as Brokers from "@db/interfaces/broker";
import * as Roles from "@db/interfaces/role";

import { clear } from "./lib/app.util";

State.Import();
Period.Import();
Instruments.Import();
InstrumentPosition.Import();
Brokers.Import();
Roles.Import();

//-------------------------------- candles Import ---------------------------------------//
async function importCandles() {
  const instruments = await Periods.Fetch({ active_collection: true });

  console.log("In Candles.Import [API]:", new Date().toLocaleString());
  console.log("-> [Info] Importing:", instruments.map((i) => i.symbol).join(", "));

  instruments?.forEach(async (db, id) => {
    const { instrument, period, symbol, timeframe, bulk_collection_rate } = db;
    const [candle] = await Candles.Fetch({ instrument, period, completed: true, limit: 1 });
    const start_time = candle.bar_time?.getTime().toString() || new Date().getTime().toString();
    const ipc = clear({ state: "start", symbol: symbol!, node: id });
    const props: Partial<Candles.ICandle> = {
      instrument,
      symbol,
      period,
      timeframe,
    };
    Import(ipc, { ...props, timestamp: start_time, limit: bulk_collection_rate });
  });
}

(async () => {
  setInterval(async () => {
    await importCandles();
  }, 5000);
})();
