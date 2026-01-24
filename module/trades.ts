//+--------------------------------------------------------------------------------------+
//|                                                                            trades.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Stops } from "module/stops";
import { Requests } from "module/requests";

import * as PositionsAPI from "api/positions";
import * as OrderAPI from "api/orders";
import * as StopsAPI from "api/stops";

//------------------ Private functions ---------------------//

//+----------------------------------------------------------------------------------------+
//| Handle order submits, rejects, and updates (from hold status);                         |
//+----------------------------------------------------------------------------------------+
const processOrders = async () => {
  await Requests.Rejected();
  await Requests.Pending();
  await Requests.Canceled();
  await Requests.Hold();
  await Requests.Queued();
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
  Stops.Report(queue);
};

//------------------ Public functions ---------------------//

//+--------------------------------------------------------------------------------------+
//| Main trade processing function;                                                      |
//+--------------------------------------------------------------------------------------+
export const Trades = async () => {
  console.log("In Execute.Trades:", new Date().toLocaleString());

  await Promise.all([PositionsAPI.Import(), OrderAPI.Import() /*StopsAPI.Import()*/]);

  await processOrders();
  //  await processStops();
};
