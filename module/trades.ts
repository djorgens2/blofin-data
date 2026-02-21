//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Stops } from "#stops";
import { Requests } from "#requests";

import { Positions, Orders, StopOrders } from "#api";

//------------------ Private functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| Handle order submits, rejects, and updates (from hold status);                         |
//+----------------------------------------------------------------------------------------+
const processOrders = async () => {
  await Requests.Rejected();
  await Requests.Pending();
  await Requests.Canceled();
  await Requests.Hold();
  const queued = await Requests.Queued();
  queued.length && console.log(queued);
};

//+--------------------------------------------------------------------------------------+
//| Handle stop order submits, rejects, and updates (from hold status);                  |
//+--------------------------------------------------------------------------------------+
const processStops = async () => {
  await Stops.Rejected();
  await Stops.Pending();
  await Stops.Canceled();
  await Stops.Hold();
  const queue = await Stops.Queued();
//  Stops.Report(queue);
};

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  console.log("In Execute.Trades:", new Date().toLocaleString());

  const [ipos, orders, stops] = await Promise.all([
    Positions.Import(),
    Orders.Import(),
    StopOrders.Import(),
  ]);

  //stops && TPSL.Report(stops);
//  orders && Requests.Report(orders);

  await processOrders();
  await processStops();
};
