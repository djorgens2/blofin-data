//+---------------------------------------------------------------------------------------+
//|                                                                          positions.ts |
//|                                                      Copyright 2018, Dennis Jorgenson |
//+---------------------------------------------------------------------------------------+
"use strict";

import type { TPosition } from "@db/interfaces/state";

import { Modify, parseColumns, Select } from "@db/query.utils";
import { hexify } from "@lib/crypto.util";

import * as States from "@db/interfaces/state";
import { isEqual } from "@lib/std.util";

export interface IPositions {
  positions: Uint8Array;
  instrument: Uint8Array;
  symbol: string;
  position: "short" | "long" | "net";
  instrument_type: Uint8Array;
  action: "buy" | "sell";
  counter_action: "buy" | "sell";
  size: number;
  size_available: number;
  leverage: number;
  digits: number;
  margin_mode: "cross" | "isolated";
  margin_used: number;
  margin_ratio: number;
  margin_initial: number;
  margin_maint: number;
  average_price: number;
  liquidation_price: number;
  mark_price: number;
  unrealized_pnl: number;
  unrealized_pnl_ratio: number;
  adl: number;
  state: Uint8Array;
  status: TPosition;
  create_time: Date | number;
  update_time: Date | number;
}

//+--------------------------------------------------------------------------------------+
//| Set-up/Configure order requests locally prior to posting request to broker;          |
//+--------------------------------------------------------------------------------------+
export async function Publish(props: Partial<IPositions>): Promise<IPositions["positions"] | undefined> {
  //const fulfilled = await States.Key({ status: "Fulfilled" });
  const { positions, create_time, update_time, ...publish } = props;
  const [fields, args] = parseColumns({ ...publish }, "");
  const key = hexify(positions!, 8);
  const sql =
    `INSERT INTO blofin.positions (${fields.join(", ")}, positions, create_time, update_time) VALUES (${Array(args.length)
      .fill("?")
      .join(", ")}, ?, FROM_UNIXTIME(?/1000), FROM_UNIXTIME(?/1000)) ` +
    `ON DUPLICATE KEY UPDATE ${fields.join(" = ?, ")}= ?, create_time = FROM_UNIXTIME(?/1000), update_time = FROM_UNIXTIME(?/1000)`;

  try {
    await Modify(sql, [...args, key, create_time, update_time, ...args, create_time, update_time]);
    return positions;
  } catch (e) {
    console.log({ sql, fields, args, props, publish: { ...args, key, create_time, update_time } });
    console.log(e);
  }
}

//+--------------------------------------------------------------------------------------+
//| Sets the state of the position; closes all inactive (closed, missing) positions;     |
//+--------------------------------------------------------------------------------------+
export async function Update(props: Array<Partial<IPositions>>) {
  const fulfilled = await Select<IPositions>(`SELECT * FROM blofin.vw_positions WHERE status = "Fulfilled"`, []);
  const closed = await States.Key({ status: "Closed" });

  for (const update of fulfilled) {
    const active = props.find(({ positions }) => isEqual(positions!, update.positions!));

    try {
      if (!active) {
        await Modify(`UPDATE blofin.positions set state = ? WHERE positions = ?`, [closed, update.positions]);
      }
    } catch (e) {
      console.log({
        sql: `UPDATE blofin.positions set state = ? WHERE positions = ?`,
        fields: ["state", "positions"],
        args: [closed, update.positions],
      });
      console.log(e);
    }
  }
}

//+--------------------------------------------------------------------------------------+
//| Fetches requests from local db that meet props criteria;                             |
//+--------------------------------------------------------------------------------------+
export async function Fetch(props: Partial<IPositions>): Promise<Array<Partial<IPositions>>> {
  const [fields, args] = parseColumns(props);
  const sql = `SELECT * FROM blofin.vw_positions ${fields.length ? " WHERE ".concat(fields.join(" AND ")) : ""}`;
  return Select<IPositions>(sql, args);
}
