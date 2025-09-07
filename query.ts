import type { IRequestAPI } from "@api/requests";
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
import * as Order from "@db/interfaces/order";
import * as Reference from "@db/interfaces/reference";
import * as Positions from "@db/interfaces/positions";
import * as InstrumentPosition from "@db/interfaces/instrument_position";
import * as Stops from "@db/interfaces/stops";

import { parseJSON } from "@lib/std.util";
import { hexify } from "./lib/crypto.util";

enum Subject {
  Account = "-a",
  Instrument = "-i",
  Contract = "-ctype",
  Currency = "-sym",
  Type = "-itype",
  Period = "-p",
  Detail = "-d",
  State = "-s",
  KeySet = "-K",
  Bars = "-bars",
  Broker = "-b",
  Role = "-r",
  Order = "-ord",
  Request = "-req",
  Queue = "-q",
  User = "-u",
  Login = "-login",
  Area = "-area",
  Environ = '-e',
  Reference = '-ref',
  Positions = '-pos',
  Stops = '-so',
  InstrumentPosition = '-ip',
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
      const props = parseJSON<Candle.ICandle>(args);
      const instrument: Instrument.IInstrument["instrument"] = await Instrument.Key({ symbol: props!.symbol }!);
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
      const props = parseJSON<Instrument.IInstrument>(args);
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
      Object.assign(props!, {
        ...props, 
        account: props?.account ? hexify(props.account) :undefined,
        request: props?.request ? hexify(props.request): undefined,
        instrument: props?.instrument ? hexify(props.instrument) : undefined,
        state: props?.state ? hexify(props.state) : undefined
      });
      const key = await Request.Fetch(props!);
      console.log(`Fetch Request [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.Queue: {
      const props = parseJSON<IRequestAPI >(args);
      Object.assign(props!, {
        ...props, 
        account: props?.account ? hexify(props.account) :undefined
      });
      const key = await Request.Queue(props!);
      console.log(`Fetch Request [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.Order: {
      const props = parseJSON< Order.IOrder >(args);
      Object.assign(props!, {
        ...props, 
        account: props?.account ? hexify(props.account) :undefined,
        request: props?.request ? hexify(props.request): undefined,
        instrument: props?.instrument ? hexify(props.instrument) : undefined,
        request_type: props?.request_type ? hexify(props.request_type) : undefined,
        order_state: props?.order_state ? hexify(props.order_state) : undefined,
        order_category: props?.order_category ? hexify(props.order_category) : undefined,
        cancel_source: props?.cancel_source ? hexify(props.cancel_source) : undefined
      });
      const key = await Order.Fetch(props!);
      console.log(`Fetch Orders [ ${Object.keys(props!).length} ]:`, props, key);
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
      const key = await Reference.Fetch(table, props!);
      console.log("Fetch reference:", props, key);
      return "ok";
    }
    case Subject.InstrumentPosition: {
      const props = parseJSON< InstrumentPosition.IInstrumentPosition >(args);
      Object.assign(props!, {
        ...props, 
        instrument_position: props?.instrument_position ? hexify(props.instrument_position) : undefined,
        instrument: props?.instrument ? hexify(props.instrument) : undefined,
        state: props?.state ? hexify(props.state) : undefined,
        auto_state: props?.auto_state ? hexify(props.auto_state) : undefined
      });
      const key = await InstrumentPosition.Fetch(props!);
      console.log(`Fetch Instrument Positions [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.Stops: {
      const props = parseJSON< Stops.IStopOrder >(args);
      Object.assign(props!, {
        ...props,
        instrument_position: props?.instrument_position ? hexify(props.instrument_position) : undefined,
        instrument: props?.instrument ? hexify(props.instrument) : undefined,
        position_state: props?.state ? hexify(props.state) : undefined,
        request_state: props?.state ? hexify(props.state) : undefined,
        order_state: props?.state ? hexify(props.state) : undefined,
        stop_request: props?.stop_request ? hexify(props.stop_request) : undefined});
      const key = await Stops.Fetch(props!);
      console.log(`Fetch Stop Orders [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.Positions: {
      const props = parseJSON< Positions.IPositions >(args);
      Object.assign(props!, {
        ...props, 
        instrument: props?.instrument ? hexify(props.instrument) : undefined,
        state: props?.state ? hexify(props.state) : undefined
      });
      const key = await Positions.Fetch(props!);
      console.log(`Fetch Positions [ ${Object.keys(props!).length} ]:`, props, key);
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
