//+--------------------------------------------------------------------------------------+
//|                                                                            broker.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { RowDataPacket } from "mysql2";

import { Select, Modify, UniqueKey } from "@db/query.utils";
import { hex } from "@/lib/std.util";

const Broker: Array<{ description: string; image_url: string; website_url: string }> = [
  { description: "Blofin", image_url: "./images/broker/no_image.png", website_url: "https://blofin.com/" },
];

export interface IKeyProps {
  broker?: Uint8Array;
  description?: string;
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
    const { description, image_url, website_url } = broker;
    Publish({ description, image_url, website_url });
  });
}

//+--------------------------------------------------------------------------------------+
//| Adds all new brokers recieved from ui or any internal source to the database;        |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: { description: string; image_url: string; website_url: string }): Promise<IKeyProps["broker"]> {
  const { description, image_url, website_url } = props;
  const broker = await Key({ description });

  if (broker === undefined) {
    const key = hex(UniqueKey(6), 3);
    await Modify(`INSERT INTO blofin.broker VALUES (?, ?, ?, ?)`, [key, description, image_url, website_url]);

    return key;
  }
  return broker;
}

//+--------------------------------------------------------------------------------------+
//| Examines broker search methods in props; executes first in priority sequence;        |
//+--------------------------------------------------------------------------------------+
export async function Key(props: IKeyProps): Promise<IKeyProps["broker"] | undefined> {
  const { broker, description } = props;
  const args = [];

  let sql: string = `SELECT broker FROM blofin.broker WHERE `;

  if (broker) {
    args.push(hex(broker, 3));
    sql += `broker = ?`;
  } else if (description) {
    args.push(description);
    sql += `description = ?`;
  } else return undefined;

  const [key] = await Select<IBroker>(sql, args);
  return key === undefined ? undefined : key.broker;
}
