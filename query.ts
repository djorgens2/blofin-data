import * as Instrument from "@db/interfaces/instrument";
import * as Contract from "@db/interfaces/contract_type";
import * as Currency from "@db/interfaces/currency";
import * as Type from "@db/interfaces/instrument_type";
import * as Period from "@db/interfaces/period";
import * as State from "@db/interfaces/trade_state";
import * as Detail from "@db/interfaces/instrument_detail";
import * as KeySet from "@db/interfaces/instrument_period";
import {parse} from '@lib/std.util';

enum Subject {
  Instrument = "-i",
  Contract = "-c",
  Currency = "-$",
  Type = "-t",
  Period = "-p",
  Detail = "-d",
  State = "-s",
  KeySet = "-K",
}

async function show(subject: string, args: string, ext: string): Promise<string> {
  console.log(subject, args);

  switch (subject) {
    case Subject.Instrument: {
      type filter = { limit: number; fromSymbol: string };
      const props = args ? parse<Instrument.IKeyProps>(args) : {};
      const extProps = ext ? parse<filter>(ext) : {};
      const key: Instrument.IKeyProps["instrument"] = await Instrument.Key(props!);
      const row = await Instrument.Fetch({ instrument: key }, extProps);
      console.log("Fetch Instrument", { props, key, row });
      return "ok";
    }
    case Subject.Contract: {
      const props = parse<Contract.IKeyProps>(args);
      const key = await Contract.Key(props!);
      console.log("Fetch contract:", props, key);
      return "ok";
    }
    case Subject.Currency: {
      const props = parse<Currency.IKeyProps>(args);
      const key = await Currency.Key(props!);
      console.log("Fetch currency:", props, key);
      return "ok";
    }
    case Subject.Type: {
      const props = parse<Type.IKeyProps>(args);
      const key = await Type.Key(props!);
      console.log("Fetch type:", props, key);
      return "ok";
    }
    case Subject.Period: {
      const props = parse<Period.IKeyProps>(args);
      const key = await Period.Key(props!);
      console.log("Fetch period:", props, key);
      return "ok";
    }
    case Subject.State: {
      const props = parse<State.IKeyProps>(args);
      const key = await State.Key(props!);
      console.log("Fetch state:", props, key);
      return "ok";
    }
    case Subject.Detail: {
      const props = parse<Detail.IKeyProps>(args);
      const key = await Detail.Key(props!);
      console.log("Fetch detail:", props, key);
      return "ok";
    }
    case Subject.KeySet: {
      const props = parse<KeySet.IKeyProps>(args);
      const key = await KeySet.Fetch(props!);
      console.log("Fetch filtered period:", props, key);
      return "ok";
    }
  }
  return "error"
}

const [cli_subject] = process.argv.slice(2);
const [cli_props] = process.argv.slice(3);
const [cli_extended_props] = process.argv.slice(4);

async function run() {
  const run = await show(cli_subject, cli_props, cli_extended_props);
  process.exit(0);
}

run();
