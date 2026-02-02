//+---------------------------------------------------------------------------------------+
//|                                                                              query.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { IRequestAPI } from "api/requests";

import * as Candle from "db/interfaces/candle";
import * as Instrument from "db/interfaces/instrument";
import * as Broker from "db/interfaces/broker";
import * as Role from "db/interfaces/role";
import * as Contract from "db/interfaces/contract_type";
import * as Currency from "db/interfaces/currency";
import * as Type from "db/interfaces/instrument_type";
import * as Period from "db/interfaces/period";
import * as State from "db/interfaces/state";
import * as User from "db/interfaces/user";
import * as Area from "db/interfaces/subject_area";
import * as Environ from "db/interfaces/environment";
import * as Account from "db/interfaces/account";
import * as Order from "db/interfaces/order";
import * as Reference from "db/interfaces/reference";
import * as Activity from "db/interfaces/activity";
import * as Authority from "db/interfaces/authority";
import * as Positions from "db/interfaces/positions";
import * as InstrumentPeriods from "db/interfaces/instrument_period";
import * as InstrumentPosition from "db/interfaces/instrument_position";
import * as Stops from "db/interfaces/stops";

import { parseJSON } from "lib/std.util";
import { hexify } from "lib/crypto.util";
import { IAuthority } from "db/interfaces/authority";
import { Select, TOptions } from "db/query.utils";
import { IStopOrder } from "db/interfaces/stops";
import { IStopsAPI } from "api/stops";

enum Subject {
  Account = "-a",
  Authority = "-auth",
  Instrument = "-i",
  Contract = "-ctype",
  Currency = "-sym",
  Type = "-itype",
  Period = "-p",
  State = "-s",
  Bars = "-bars",
  Broker = "-b",
  Role = "-r",
  Order = "-ord",
  StopsQueue = "-soq",
  Queue = "-q",
  User = "-u",
  Login = "-login",
  Task = "-task",
  Area = "-area",
  Environ = "-e",
  Reference = "-ref",
  Positions = "-pos",
  Stops = "-so",
  InstrumentPeriod = "-ip",
  InstrumentPosition = "-ipos",
}

const show = async (subject: string, args: string): Promise<string> => {
  console.log(subject, args);

  switch (subject) {
    case Subject.Broker: {
      const props = parseJSON<Broker.IBroker>(args);
      props!.broker && Object.assign(props!, { ...props, broker: hexify(props!.broker) });
      const key = await Broker.Key(props!);
      const rows = await Broker.Fetch(props!);
      console.log("Fetch Broker:", props, { key }, rows);
      return "ok";
    }
    case Subject.Authority: {
      const props = parseJSON<IAuthority>(args);
      props!.authority && Object.assign(props!, { ...props, authority: hexify(props!.authority) });
      const key = await Authority.Key(props!);
      const rows = await Authority.Fetch(props!);
      console.log("Fetch Authority:", props, { key }, rows);
      return "ok";
    }
    case Subject.Bars: {
      const props = parseJSON<Candle.ICandle>(args);
      const instrument = await Instrument.Key({ symbol: props!.symbol });
      const period = await Period.Key({ timeframe: props!.timeframe });
      const bars = await Candle.Fetch({ ...props!, instrument: instrument!, period: period! });
      console.log("Fetch filtered period:", props, bars);
      return "ok";
    }
    case Subject.Contract: {
      const props = parseJSON<Contract.IContractType>(args);
      props!.contract_type && Object.assign(props!, { ...props, contract_type: hexify(props!.contract_type) });
      const key = await Contract.Key(props!);
      const rows = await Contract.Fetch(props!);
      console.log("Fetch contract types:", props, key, rows);
      return "ok";
    }
    case Subject.Currency: {
      const props = parseJSON<Currency.ICurrency>(args);
      props!.currency && Object.assign(props!, { ...props, currency: hexify(props!.currency) });
      const key = await Currency.Key(props!);
      const rows = await Currency.Fetch(props!);
      console.log("Fetch currency:", props, { key }, rows);
      return "ok";
    }
    case Subject.Instrument: {
      const props = parseJSON<Instrument.IInstrument>(args);
      props!.instrument && Object.assign(props!, { ...props, instrument: hexify(props!.instrument) });
      const key = await Instrument.Key(props!);
      const rows = await Instrument.Fetch(props!);
      console.log("Fetch Instrument", props, { key }, rows);
      return "ok";
    }
    case Subject.Type: {
      const props = parseJSON<Type.IInstrumentType>(args);
      props!.instrument_type && Object.assign(props!, { ...props, instrument_type: hexify(props!.instrument_type) });
      const key = await Type.Key(props!);
      const rows = await Type.Fetch(props!);
      console.log("Fetch type:", props, { key }, rows);
      return "ok";
    }
    case Subject.Period: {
      const props = parseJSON<Period.IPeriod>(args);
      props!.period && Object.assign(props!, { ...props, period: hexify(props!.period) });
      const key = await Period.Key(props!);
      const rows = await Period.Fetch(props!);
      console.log("Fetch period:", props, { key }, rows);
      return "ok";
    }
    case Subject.Role: {
      const props = parseJSON<Role.IRole>(args);
      props!.role && Object.assign(props!, { ...props, role: hexify(props!.role) });
      const key = await Role.Key(props!);
      const rows = await Role.Fetch(props!);
      console.log("Fetch Role:", props, { key }, rows);
      return "ok";
    }
    case Subject.State: {
      const props = parseJSON<State.IState>(args);
      props!.state && Object.assign(props!, { ...props, state: hexify(props!.state) });
      //      props!.status && Object.assign(props!, {status: undefined})
      const key = await State.Key(props!);
      const rows = await State.Fetch(props!);
      console.log("Fetch state:", props, { key }, rows);
      return "ok";
    }
    case Subject.Area: {
      const props = parseJSON<Area.ISubjectArea>(args);
      props!.subject_area && Object.assign(props!, { ...props, subject: hexify(props!.subject_area) });
      const key = await Area.Key(props!);
      const rows = await Area.Fetch(props!);
      console.log("Fetch Subject:", props, { key }, rows);
      return "ok";
    }
    case Subject.Environ: {
      const props = parseJSON<Environ.IEnvironment>(args);
      props!.environment && Object.assign(props!, { ...props, environment: hexify(props!.environment) });
      const key = await Environ.Key(props!);
      const rows = await Environ.Fetch(props!);
      console.log("Fetch Environments:", props, { key }, rows);
      return "ok";
    }
    case Subject.User: {
      const props = parseJSON<User.IUser>(args);
      props!.user && Object.assign(props!, { ...props, user: hexify(props!.user) });
      const key = await User.Key(props!);
      const rows = await User.Fetch(props!);
      console.log("Fetch User:", props, { key }, rows);
      return "ok";
    }
    case Subject.Task: {
      const props = parseJSON<Activity.IActivity>(args);
      props!.activity && Object.assign(props!, { ...props, user: hexify(props!.activity) });
      const key = await Activity.Key(props!);
      const rows = await Activity.Fetch(props!);
      console.log("Fetch Tasks:", props, { key }, rows);
      return "ok";
    }
    case Subject.Login: {
      const props = parseJSON<{ username: string; email: string; password: string }>(args);
      const logged = await User.Login(props!);
      console.log("Fetch User:", props, logged, logged ? "Success" : "Error");
      return "ok";
    }
    case Subject.Account: {
      const props = parseJSON<Account.IAccount>(args);
      Object.assign(props!, {
        ...props,
        account: hexify(props?.account!),
      });
      const rows = await Account.Fetch(props!);
      console.log("Fetch Account:", props, { key: 0 }, rows);
      return "ok";
    }
    case Subject.Queue: {
      const props = parseJSON<IRequestAPI>(args);
      Object.assign(props!, {
        ...props,
        account: hexify(props?.account!),
      });
      const rows = await Select<IRequestAPI>(props!, { table: `vw_api_requests` });
      console.log(`Fetch Queue [API] [ ${Object.keys(props!).length} ]:`, props, rows);
      return "ok";
    }
    case Subject.StopsQueue: {
      const props = parseJSON<IStopsAPI>(args);
      Object.assign(props!, {
        ...props,
        account: hexify(props?.account!),
      });
      const rows = await Select<IStopsAPI>(props!, { table: `vw_api_stop_requests` });
      console.log(`Fetch Stop Request Queue [API] [ ${Object.keys(props!).length} ]:`, props, rows);
      return "ok";
    }
    case Subject.Order: {
      const props = parseJSON<Order.IOrder & TOptions>(args);
      if (props) {
        const { limit, suffix, ...keys } = props;
        const options = {
          limit,
          suffix
        } as TOptions;

        Object.assign(keys, {
          ...keys,
          account: hexify(keys.account),
          request: hexify(keys.request),
          order_id: hexify(keys.order_id),
          instrument: hexify(keys.instrument),
          instrument_position: hexify(keys.instrument_position),
          request_type: hexify(keys.request_type),
          order_state: hexify(keys.order_state),
          order_category: hexify(keys.order_category),
          cancel_source: hexify(keys.cancel_source),
        });
        const rows = await Order.Fetch(keys, options);
        console.log(`Fetch Orders [ ${Object.keys(keys).length} ]:`, options, keys, rows);
        return "ok";
      }
      console.log("[Error] Orders: Unauthorized fetch attempt")
    }
    case Subject.Reference: {
      const json = parseJSON<Reference.IReference>(args);
      if (!json || typeof json.table === "undefined") {
        console.log("Reference fetch error: missing table property");
        return "error";
      }
      const { table, ...props } = json;
      Object.assign(props!, {
        ...props,
        order_state: hexify(props.order_state!),
        order_category: hexify(props.order_category!),
        cancel_source: hexify(props.cancel_source!),
        request_type: hexify(props.request_type!),
      });
      const rows = await Reference.Fetch(props!, { table });
      console.log("Fetch reference:", props, rows);
      return "ok";
    }
    case Subject.InstrumentPeriod: {
      const props = parseJSON<InstrumentPeriods.IInstrumentPeriod>(args);
      Object.assign(props!, {
        ...props,
        instrument: hexify(props?.instrument!),
        period: hexify(props?.period!),
      });
      const key = await InstrumentPeriods.Fetch(props!);
      console.log(`Fetch Instrument Periods [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.InstrumentPosition: {
      const props = parseJSON<InstrumentPosition.IInstrumentPosition>(args);
      props &&
        Object.assign(props!, {
          ...props,
          account: hexify(props.account!),
          instrument_position: hexify(props.instrument_position!),
          instrument: hexify(props.instrument),
          state: hexify(props.state),
          auto_state: hexify(props.auto_state),
        });
      const key = await InstrumentPosition.Fetch(props!);
      console.log(`Fetch Instrument Positions [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.Stops: {
      const props = parseJSON<IStopOrder>(args);
      Object.assign(props!, {
        ...props,
        account: hexify(props?.account!),
        instrument_position: hexify(props?.instrument_position!),
        instrument: hexify(props?.instrument!),
        state: hexify(props?.state!),
        position_state: hexify(props?.position_state!),
        request_state: hexify(props?.request_state!),
        order_state: hexify(props?.order_state!),
        stop_request: hexify(props?.stop_request!),
        tpsl_id: hexify(props?.tpsl_id!),
      });
      const key = await Stops.Fetch(props!);
      console.log(`Fetch Stop Orders [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
    case Subject.Positions: {
      const props = parseJSON<Positions.IPositions>(args);
      Object.assign(props!, {
        ...props,
        account: hexify(props?.account!),
        positions: hexify(props?.positions!),
        instrument_position: hexify(props?.instrument_position!),
        instrument: hexify(props?.instrument!),
        state: hexify(props?.state!),
      });
      const key = await Positions.Fetch(props!);
      console.log(`Fetch Positions [ ${Object.keys(props!).length} ]:`, props, key);
      return "ok";
    }
  }
  return "error";
};

const [cli_subject] = process.argv.slice(2);
const [cli_props] = process.argv.slice(3);
const [cli_extended_props] = process.argv.slice(4);

const run = async () => {
  const run = await show(cli_subject, cli_props);
  process.exit(0);
};

run();
