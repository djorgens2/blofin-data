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
import * as User from "@db/interfaces/user";
import * as KeySet from "@db/interfaces/instrument_period";
import * as Area from "@db/interfaces/subject";
import * as Environ from "@db/interfaces/environment";
import * as Account from "@db/interfaces/account";
import * as Request from "@db/interfaces/request";
import * as Reference from "@db/interfaces/reference";

import { parseJSON } from "@lib/std.util";
import { hexify } from "./lib/crypto.util";

enum Subject {
  Account = "-a",
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
  Request = "-req",
  User = "-u",
  Login = "-login",
  Area = "-area",
  Environ = '-e',
  Reference = '-ref',
}

async function show(subject: string, args: string): Promise<string> {
  console.log(subject, args);

  switch (subject) {
    case Subject.Broker: {
      const props = parseJSON<Broker.IKeyProps>(args);
      props!.broker && Object.assign(props!, { ...props, broker: hexify(props!.broker) });
      const key = await Broker.Key(props!);
      console.log("Fetch Broker:", props, key);
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
    case Subject.Contract: {
      const props = parseJSON<Contract.IKeyProps>(args);
      props!.contract_type && Object.assign(props!, { ...props, contract_type: hexify(props!.contract_type) });
      const key = await Contract.Key(props!);
      console.log("Fetch contract:", props, key);
      return "ok";
    }
    case Subject.Currency: {
      const props = parseJSON<Currency.IKeyProps>(args);
      props!.currency && Object.assign(props!, { ...props, currency: hexify(props!.currency) });
      const key = await Currency.Key(props!);
      console.log("Fetch currency:", props, key);
      return "ok";
    }
    case Subject.Instrument: {
      const props = parseJSON<Instrument.IKeyProps>(args);
      props!.instrument && Object.assign(props!, { ...props, instrument: hexify(props!.instrument) });
      const row = await Instrument.Fetch(props!);
      console.log("Fetch Instrument", { props, row });
      return "ok";
    }
    case Subject.Type: {
      const props = parseJSON<Type.IKeyProps>(args);
      props!.instrument_type && Object.assign(props!, { ...props, instrument_type: hexify(props!.instrument_type) });
      const key = await Type.Key(props!);
      console.log("Fetch type:", props, key);
      return "ok";
    }
    case Subject.Period: {
      const props = parseJSON<Period.IKeyProps>(args);
      props!.period && Object.assign(props!, { ...props, period: hexify(props!.period) });
      const key = await Period.Key(props!);
      console.log("Fetch period:", props, key);
      return "ok";
    }
    case Subject.Role: {
      const props = parseJSON<Role.IKeyProps>(args);
      props!.role && Object.assign(props!, { ...props, role: hexify(props!.role) });
      const key = await Role.Key(props!);
      console.log("Fetch Role:", props, key);
      return "ok";
    }
    case Subject.State: {
      const props = parseJSON<State.TState>(args);
      props!.state && Object.assign(props!, { ...props, state: hexify(props!.state) });
      const key = await State.Key(props!);
      console.log("Fetch state:", props, key);
      return "ok";
    }
    case Subject.Area: {
      const props = parseJSON<Area.IKeyProps>(args);
      props!.subject && Object.assign(props!, { ...props, subject: hexify(props!.subject) });
      const key = await Area.Fetch(props!);
      console.log("Fetch Subject:", props, key);
      return "ok";
    }
    case Subject.Environ: {
      const props = parseJSON<Environ.IKeyProps>(args);
      props!.environment && Object.assign(props!, { ...props, environment: hexify(props!.environment) });
      const key = await Environ.Fetch(props!);
      console.log("Fetch Environments:", props, key);
      return "ok";
    }
    case Subject.User: {
      const props = parseJSON<User.IUser>(args);
      props!.user && Object.assign(props!, { ...props, user: hexify(props!.user) });
      const key = await User.Key(props!);
      console.log("Fetch User:", props, key);
      return "ok";
    }
    case Subject.Login: {
      const props = parseJSON<{ username: string; email: string; password: string }>(args);
      const logged = await User.Login(props!);
      console.log("Fetch User:", props, logged, logged ? "Success" : "Error");
      return "ok";
    }
    case Subject.Account: {
      const props = parseJSON< Account.IKeyProps >(args);
      const key = await Account.Fetch(props!);
      console.log("Fetch Account:", props, key);
      return "ok";
    }
    case Subject.Request: {
      const props = parseJSON< Request.IRequest >(args);
      const key = await Request.Fetch(props!);
      console.log("Fetch Request:", props, key);
      return "ok";
    }
    case Subject.Detail: {
      const props = parseJSON<Detail.IKeyProps>(args);
      const key = await Detail.Key(props!);
      console.log("Fetch detail:", props, key);
      return "ok";
    }
    case Subject.Reference: {
      const json = parseJSON<Reference.IKeyProps>(args);
      // @ts-ignore
      const { table, ...props} = json;
      const key = await Reference.Fetch<Reference.IKeyProps>(table, props!);
      console.log("Fetch reference:", props, key);
      return "ok";
    }
    case Subject.KeySet: {
      const props = parseJSON<KeySet.IKeyProps>(args);
      const key = await KeySet.Fetch(props!);
      console.log("Fetch filtered period:", props, key);
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
