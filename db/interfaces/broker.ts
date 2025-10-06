//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Select, Insert } from "db/query.utils";
import { hashKey } from "lib/crypto.util";

export interface IBroker {
  broker: Uint8Array;
  name: string;
  image_url: string;
  website_url: string;
}

//+--------------------------------------------------------------------------------------+
//| Inserts first broker (blofin) into the local database;                               |
//+--------------------------------------------------------------------------------------+
export const Import = async () => {
  console.log("In Broker.Import:", new Date().toLocaleString());

  const success: Array<Partial<IBroker>> = [];
  const errors: Array<Partial<IBroker>> = [];
  const brokers: Array<Partial<IBroker>> = [{ name: "Blofin", image_url: "./images/broker/blofin.png", website_url: "https://blofin.com/" }];

  for (const broker of brokers) {
    const result = await Add(broker);
    result ? success.push({ broker: result }) : errors.push({ name: broker.name });
  }

  success.length && console.log("   # Broker imports: ", success.length, "verified");
  errors.length && console.log("   # Broker rejects: ", errors.length, { errors });
};

//+--------------------------------------------------------------------------------------+
//| Add a broker to local database;                                                      |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IBroker>): Promise<IBroker["broker"] | undefined> => {
  if (props.broker === undefined) {
    Object.assign(props, { broker: hashKey(6) });
    const result = await Insert<IBroker>(props, { table: `broker`, ignore: true });
    return result ? result.broker : undefined;
  } else return props.broker;
};

//+--------------------------------------------------------------------------------------+
//| Returns a broker key using supplied params;                                          |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IBroker>): Promise<IBroker["broker"] | undefined> => {
  if (Object.keys(props).length) {
    const [result] = await Select<IBroker>(props, { table: `broker` });
    return result ? result.broker : undefined;
  } else return undefined;
};

//+--------------------------------------------------------------------------------------+
//| Returns brokers meeting supplied criteria; all on request of an empty prop set {};   |
//+--------------------------------------------------------------------------------------+
export const Fetch = async (props: Partial<IBroker>): Promise<Array<Partial<IBroker>> | undefined> => {
  const result = await Select<IBroker>(props, { table: `broker` });
  return result.length ? result : undefined;
};
