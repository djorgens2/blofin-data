//+--------------------------------------------------------------------------------------+
//|                                                                    [Stops]  index.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Hold } from "#module/stops/hold";
import { Queued } from "#module/stops/queued";
import { Pending } from "#module/stops/pending";
import { Canceled } from "#module/stops/canceled";
import { Rejected } from "#module/stops/rejected";
import { Report } from "#module/stops/report";

//-- Stops namespace declaration
export const Stops = {
  Hold,
  Queued,
  Pending,
  Canceled,
  Rejected,
  Report,
};
