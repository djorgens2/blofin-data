import * as Candle from "@db/interfaces/candle";
import * as Instrument from "@db/interfaces/instrument";
import * as Broker from "@db/interfaces/broker";
import * as Role from "@db/interfaces/role";
import * as Contract from "@db/interfaces/contract_type";
import * as Currency from "@db/interfaces/currency";
import * as Type from "@db/interfaces/instrument_type";
import * as Period from "@db/interfaces/period";
import * as State from "@db/interfaces/state";
import * as Detail from "@db/interfaces/instrument_detail";
import * as KeySet from "@db/interfaces/instrument_period";

import { parseJSON } from "@lib/std.util";

enum Subject {
  Instrument = "-i",
  Contract = "-ctype",
  Currency = "-$",
  Type = "-itype",
  Period = "-p",
  Detail = "-d",
  State = "-s",
  KeySet = "-K",
  Bars = "-bars",
  Broker = "-b",
  Role = "-r",
}

async function show(subject: string, args: string): Promise<string> {
  console.log(subject, args);

  switch (subject) {
    case Subject.Instrument: {
      const props = args ? parseJSON<Instrument.IKeyProps>(args) : {};
      const row = await Instrument.Fetch(props!);

      console.log("Fetch Instrument", { props, row });
      return "ok";
    }
    case Subject.Broker: {
      const props = parseJSON<Broker.IKeyProps>(args);
      const key = await Broker.Key(props!);
      console.log("Fetch Broker:", props, key);
      return "ok";
    }
    case Subject.Role: {
      const props = parseJSON<Role.IKeyProps>(args);
      const key = await Role.Key(props!);
      console.log("Fetch Role:", props, key);
      return "ok";
    }
    case Subject.Contract: {
      const props = parseJSON<Contract.IKeyProps>(args);
      const key = await Contract.Key(props!);
      console.log("Fetch contract:", props, key);
      return "ok";
    }
    case Subject.Currency: {
      const props = parseJSON<Currency.IKeyProps>(args);
      const key = await Currency.Key(props!);
      console.log("Fetch currency:", props, key);
      return "ok";
    }
    case Subject.Type: {
      const props = parseJSON<Type.IKeyProps>(args);
      const key = await Type.Key(props!);
      console.log("Fetch type:", props, key);
      return "ok";
    }
    case Subject.Period: {
      const props = parseJSON<Period.IKeyProps>(args);
      const key = await Period.Key(props!);
      console.log("Fetch period:", props, key);
      return "ok";
    }
    case Subject.State: {
      const props = parseJSON<State.IKeyProps>(args);
      const key = await State.Key(props!);
      console.log("Fetch state:", props, key);
      return "ok";
    }
    case Subject.Detail: {
      const props = parseJSON<Detail.IKeyProps>(args);
      const key = await Detail.Key(props!);
      console.log("Fetch detail:", props, key);
      return "ok";
    }
    case Subject.KeySet: {
      const props = parseJSON<KeySet.IKeyProps>(args);
      const key = await KeySet.Fetch(props!);
      console.log("Fetch filtered period:", props, key);
      return "ok";
    }
    case Subject.Bars: {
      const props = parseJSON<Candle.IKeyProps>(args);
      const instrument: Instrument.IKeyProps["instrument"] = await Instrument.Key({ symbol: props!.symbol }!);
      const period = await Period.Key({ timeframe: props!.timeframe });
      const bars = await Candle.Fetch({ ...props!, instrument: instrument!, period: period! });
      console.log("Fetch filtered period:", props, bars);
      return "ok";
    }
  }
  return "error";
}

const [cli_subject] = process.argv.slice(2);
const [cli_props] = process.argv.slice(3);
const [cli_extended_props] = process.argv.slice(4);

async function run() {
  const run = await show(cli_subject, cli_props);
  process.exit(0);
}

run();
