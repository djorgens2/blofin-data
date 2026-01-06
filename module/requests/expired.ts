//+--------------------------------------------------------------------------------------+
//|                                                                [requests] expired.ts |
//|                                                     Copyright 2018, Dennis Jorgenson |
//+--------------------------------------------------------------------------------------+
"use strict";

import type { IRequest } from "db/interfaces/request";
import type { IPublishResult } from "db/query.utils";

import * as Request from "db/interfaces/request";

//-- [Process.Orders] Expires requests beyond expiry
export const Expired = async (expired: Array<Partial<IRequest>>): Promise<Array<IPublishResult<IRequest>>> => {
  if (!expired.length) return [];

  const result = Promise.all(
    expired.map((request) =>
      Request.Submit({
        ...request,
        status: "Expired",
        update_time: new Date(),
        memo: request.memo || `[Expired]: Request expired beyond set expiry time`,
      })
    )
  );
  return result;
};
