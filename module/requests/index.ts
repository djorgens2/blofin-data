//+--------------------------------------------------------------------------------------+
//|                                                                 [requests]  index.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import { Hold } from "#module/requests/hold";
import { Queued } from "#module/requests/queued";
import { Pending } from "#module/requests/pending";
import { Canceled } from "#module/requests/canceled";
import { Rejected } from "#module/requests/rejected";
import { Report } from "#module/requests/report";

//-- Stops namespace declaration
export const Requests = {
  Hold,
  Queued,
  Pending,
  Canceled,
  Rejected,
  Report,
};
