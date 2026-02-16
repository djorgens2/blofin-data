//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IPublishResult } from "api";

import { Select, Insert } from "db/query.utils";
import { PrimaryKey } from "api";
import { hashKey } from "lib/crypto.util";
import { hasValues } from "lib/std.util";

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

  const brokers: Array<Partial<IBroker>> = [{ name: "Blofin", image_url: "./images/broker/blofin.png", website_url: "https://blofin.com/" }];

  const result = await Promise.all(brokers.map(async (broker) => Add(broker)));
  const exists = result.filter((r) => r.response.code === 200);
  console.log(
    `-> Broker.Import complete:`,
    exists.length - result.length ? `${result.filter((r) => r.response.success).length} new brokers;` : `No new brokers;`,
    `${exists.length} brokers verified;`,
  );
};

//+--------------------------------------------------------------------------------------+
//| Add a broker to local database;                                                      |
//+--------------------------------------------------------------------------------------+
export const Add = async (props: Partial<IBroker>): Promise<IPublishResult<IBroker>> => {
  Object.assign(props, { broker: hashKey(6) });
  const result = await Insert<IBroker>(props, { table: `broker`, ignore: true, context: "Broker.Add" });
  return { key: PrimaryKey(props, ["broker"]), response: result };
};

//+--------------------------------------------------------------------------------------+
//| Returns a broker key using supplied params;                                          |
//+--------------------------------------------------------------------------------------+
export const Key = async (props: Partial<IBroker>): Promise<IBroker["broker"] | undefined> => {
  if (hasValues<Partial<IBroker>>(props)) {
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
