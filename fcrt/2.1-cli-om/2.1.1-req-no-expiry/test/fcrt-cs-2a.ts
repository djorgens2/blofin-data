//----------------------------- order test  -------------------------------------------------------//
import type { TRefKey } from "#db";
import type { IRequest } from "#db/interfaces/request";

import { setSession, Session } from "#app/session";
import { hexify } from "#lib/crypto.util";
import { req_fcrt_2a } from "./request.ts";

import * as IPos from "#db/interfaces/instrument_position";
import * as Orders from "#db/interfaces/order";
import * as Requests from "#db/interfaces/request";
import * as References from "#db/interfaces/reference";

const args = process.argv.slice(2); // get account id

if (args.length) {
  setSession({ account: hexify(args[0]) });

  const submit = async (request: Partial<IRequest>) => {
    const instrument_position = await IPos.Key({account: Session().account, symbol: req_fcrt_2a.symbol, position: req_fcrt_2a.position});
    const request_type = await References.Key<TRefKey>({ source_ref: req_fcrt_2a.order_type }, { table: `request_type` });
    const submitted = await Requests.Submit({ ...request, instrument_position, request_type, memo: "Test 2a: request w/o expiry; w/o tpsl" });
    console.log({ submitted, request });
    return submitted;
  };
  
  submit(req_fcrt_2a)
  .then(async (submitted) => {
    if (submitted === undefined) {
        Log().error(Session());
        Log().error("Test 2a: Request submission failed.");
        Log().error("Check if the request was already submitted or if there was an error in the submission process.");
//        Log().error("Request details:", request);
        Log().error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted.key?.request }).then((order) => {
        console.log("Test 2a: Request submitted, check db for results.", submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      Log().error("Test 2a: Error during request submission:", error);
      process.exit(1);
    });
} else Log().error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
