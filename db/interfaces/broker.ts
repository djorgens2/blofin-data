//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify } from "@db/query.utils";
import { hashKey } from "@/lib/crypto.util";

const Broker: Array<{ alias: string; image_url: string; website_url: string }> = [
  { alias: "Blofin", image_url: "./images/broker/no_image.png", website_url: "https://blofin.com/" },
];

export interface IKeyProps {
  broker?: Uint8Array;
  alias?: string;
}

export interface IBroker extends IKeyProps, RowDataPacket {
  image_url: string;
  website_url: string;
}

//+--------------------------------------------------------------------------------------+
//| Imports 'known' brokers from seed data to the database;                              |
//+--------------------------------------------------------------------------------------+
export function Import() {
  Broker.forEach((broker) => {
    const { alias, image_url, website_url } = broker;
    Publish({ alias, image_url, website_url });
  });
}

//+--------------------------------------------------------------------------------------+
//| Adds all new brokers recieved from ui or any internal source to the database;        |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: { alias: string; image_url: string; website_url: string }): Promise<IKeyProps["broker"]> {
  const { alias, image_url, website_url } = props;
  const broker = await Key({ alias });

  if (broker === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.broker VALUES (?, ?, ?, ?)`, [key, alias, image_url, website_url]);

    return key;
  }
  return broker;
}

//+--------------------------------------------------------------------------------------+
//| Examines broker search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["broker"] | undefined> {
  const { broker, alias } = props;
  const args = [];

  console.log(typeof props.broker, props.broker)
  let sql: string = `SELECT broker FROM blofin.broker WHERE `;

  if (broker) {
    args.push(broker);
    sql += `broker = ?`;
  } else if (alias) {
    args.push(alias);
    sql += `alias = ?`;
  } else return undefined;

  const [key] = await Select<IBroker>(sql, args);
  return key === undefined ? undefined : key.broker;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<IKeyProps>> {
  const { broker, alias } = props;
  const args = [];

  let sql: string = `SELECT role FROM blofin.role`;

  if (broker) {
    args.push(broker);
    sql += ` WHERE broker = ?`;
  } else if (alias) {
    args.push(alias);
    sql += ` WHERE alias = ?`;
  }

  return Select<IBroker>(sql, args);
}
