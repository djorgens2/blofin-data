//----------------------------- order test  -------------------------------------------------------//
import type { TRefKey } from "db/interfaces/reference";
import type { IRequest } from "db/interfaces/request";

import { config, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { setExpiry } from "lib/std.util";

import * as Request from "./request";

import * as IPos from "db/interfaces/instrument_position";
import * as Orders from "db/interfaces/order";
import * as Requests from "db/interfaces/request";
import * as References from "db/interfaces/reference";

const args = process.argv.slice(2); // get account id
const submit = async (request: Partial<IRequest>, testId: string) => {
  await config({ account: hexify(args[0]) });

  const expiry_time = setExpiry(`1d`); // 1 day from now
  const instrument_position = await IPos.Key({ account: Session().account, symbol: request.symbol, position: request.position });
  const request_type = await References.Key<TRefKey>({ source_ref: request.order_type }, { table: `request_type` });
  const submitted = await Requests.Submit({
    ...request,
    instrument_position,
    request_type,
    expiry_time: request.expiry_time || expiry_time,
    memo: request.memo || `Test ${testId}: leverage test;`,
  });
  return [submitted, request];
};

if (args.length) {
  const testId = args[1] || `2a`;
  const request = testId === `2a` ? Request.req_fcrt_2a : testId === `2b` ? Request.req_fcrt_2b : testId === `2c` ? Request.req_fcrt_2c : undefined;
  request &&
    submit({ ...request, update_time: new Date() }, testId)
      .then(async ([submitted, request]) => {
        if (submitted === undefined) {
          console.error(Session());
          console.error(`Test ${testId}: Request submission failed.`);
          console.error("Check if the request was already submitted or if there was an error in the submission process.");
          console.error("Request details:", request);
          console.error(`Exiting process with code 1 for test ${testId}.`);
          process.exit(1);
        }
        await Orders.Fetch({ request: submitted! } as Partial<IRequest>).then((order) => {
          console.log(`Test ${testId}: Request submitted, check db for results.`, submitted);
          console.log("Fetched order from DB:", order);
        });
        process.exit(0);
      })
      .catch((error) => {
        console.error(`Test ${testId}: Error during request submission:`, error);
        process.exit(1);
      });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
