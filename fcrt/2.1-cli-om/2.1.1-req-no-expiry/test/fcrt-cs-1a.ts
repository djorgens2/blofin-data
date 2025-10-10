//----------------------------- order test  -------------------------------------------------------//
import type { TRefKey } from "db/interfaces/reference";
import type { IRequest } from "db/interfaces/request";

import { setSession, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_1a } from "./request";

import * as IPos from "db/interfaces/instrument_position";
import * as Orders from "db/interfaces/order";
import * as Requests from "db/interfaces/request";
import * as References from "db/interfaces/reference";

const args = process.argv.slice(2); // get account id

if (args.length) {
  setSession({ account: hexify(args[0]) });

  const submit = async (request: Partial<IRequest>) => {
    const instrument_position = await IPos.Key({account: Session().account, symbol: req_fcrt_1a.symbol, position: req_fcrt_1a.position});
    const request_type = await References.Key<TRefKey>({ source_ref: req_fcrt_1a.order_type }, { table: `request_type` });
    const submitted = await Requests.Submit({ ...request, instrument_position, request_type, memo: "Test 1: request w/o expiry; w/o tpsl" });
    console.log({ submitted, request });
    return [submitted, request];
  };
  
  submit(req_fcrt_1a)
  .then(async ([submitted, request]) => {
    if (submitted === undefined) {
        console.error(Session());
        console.error("Test 1: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted! } as Partial<IRequest>).then((order) => {
        console.log("Test 1: Request submitted, check db for results.", submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test 1: Error during request submission:", error);
      process.exit(1);
    });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
