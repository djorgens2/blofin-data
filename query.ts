import * as Instrument from "@db/interfaces/instrument";
import * as Contract from "@db/interfaces/contract_type";
import * as Currency from "@db/interfaces/currency";
import * as Type from "@db/interfaces/instrument_type";
import * as Period from "@db/interfaces/period";
import * as State from "@db/interfaces/trade_state";
import * as Detail from "@db/interfaces/instrument_detail";
import * as KeySet from "@db/interfaces/instrument_period";

enum Subject {
  Instrument = "-i",
  Contract = "-c",
  Currency = "-$",
  Type = "-t",
  Period = "-p",
  Detail = "-d",
  State = "-s",
  KeySet = "-K"
}

function parser<T>(arg: string): Partial<T> {
  const obj: Partial<T> = {};

  try {
    const json = JSON.parse(arg);

    if (typeof json === "object" && json !== null) {
      const obj: Partial<T> = json;
      return obj;
    }
  } catch (e) {
    const parts = arg.split("=");
    throw new Error("something jacked up");
    // if (parts.length === 2) {
    //   const key = parts[0].trim();
    //   const value = parts[1].trim();
    //   obj[key] = value;
    // }
    // return obj;
  }

  return obj;
}

async function show(subject: string, args: string) {
  console.log(subject, args);

  switch (subject) {
    case Subject.Instrument: {
      const props: Instrument.IKeyProps = parser<Instrument.IKeyProps>(args);
      const key = await Instrument.Key(props);
      console.log("Fetch Instrument:", props, key);
      break;
    }
    case Subject.Contract: {
      const props: Contract.IKeyProps = parser<Contract.IKeyProps>(args);
      const key = await Contract.Key(props);
      console.log("Fetch contract:", props, key);
      break;
    }
    case Subject.Currency: {
      const props: Currency.IKeyProps = parser<Currency.IKeyProps>(args);
      const key = await Currency.Key(props);
      console.log("Fetch currency:", props, key);
      break;
    }
    case Subject.Type: {
      const props: Type.IKeyProps = parser<Type.IKeyProps>(args);
      const key = await Type.Key(props);
      console.log("Fetch type:", props, key);
      break;
    }
    case Subject.Period: {
      const props: Period.IKeyProps = parser<Period.IKeyProps>(args);
      const key = await Period.Key(props);
      console.log("Fetch period:", props, key);
      break;
    }
    case Subject.State: {
      const props: State.IKeyProps = parser<State.IKeyProps>(args);
      const key = await State.Key(props);
      console.log("Fetch state:", props, key);
      break;
    }
    case Subject.Detail: {
      const props: Detail.IKeyProps = parser<Detail.IKeyProps>(args);
      const key = await Detail.Key(props);
      console.log("Fetch detail:", props, key);
      break;
    }
    case Subject.KeySet: {
      const props: KeySet.IKeyProps = parser<KeySet.IKeyProps>(args);
      const key = await KeySet.Fetch(props);
      console.log("Fetch filtered period:", props, key);
      break;
    }
  }
}

const [cli_subject] = process.argv.slice(2);
const [cli_props] = process.argv.slice(3);

show(cli_subject, cli_props);
