//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify } from "@db/query.utils";
import { hashKey } from "@lib/crypto.util";

export interface IKeyProps {
  broker?: Uint8Array;
  name?: string;
  image_url?: string;
  website_url?: string;
}

export interface IBroker extends IKeyProps, RowDataPacket {}

export const Import = async () =>  await Add({name: 'Blofin', image_url: './images/broker/no_image.png', website_url: 'https://blofin.com/'});

//+--------------------------------------------------------------------------------------+
//| Adds all new brokers recieved from ui or any internal source to the database;        |
//+--------------------------------------------------------------------------------------+
export async function Add(props: Partial<IKeyProps>): Promise<IKeyProps["broker"]> {
  const { name, image_url, website_url } = props;
  const broker = await Key({ name });

  if (broker === undefined) {
    const key = hashKey(6);
    await Modify(`INSERT INTO blofin.broker VALUES (?, ?, ?, ?)`, [key, name, image_url, website_url]);

    return key;
  }
  return broker;
}

//+--------------------------------------------------------------------------------------+
//| Examines broker search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["broker"] | undefined> {
  const { broker, name } = props;
  const args = [];

  let sql: string = `SELECT broker FROM blofin.broker WHERE `;

  if (broker) {
    args.push(broker);
    sql += `broker = ?`;
  } else if (name) {
    args.push(name);
    sql += `name = ?`;
  } else return undefined;

  const [key] = await Select<IBroker>(sql, args);
  return key === undefined ? undefined : key.broker;
}

//+--------------------------------------------------------------------------------------+
//| Executes a query in priority sequence based on supplied seek params; returns key;    |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: IKeyProps): Promise<Array<Partial<IBroker>>> {
  const { broker, name } = props;
  const args = [];

  let sql: string = `SELECT * FROM blofin.broker`;

  if (broker) {
    args.push(broker);
    sql += ` WHERE broker = ?`;
  } else if (name) {
    args.push(name);
    sql += ` WHERE name = ?`;
  }

  return Select<IBroker>(sql, args);
}
