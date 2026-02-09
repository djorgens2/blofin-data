//----------------------------- stop order test  -------------------------------------------------------//
import type { IStopRequest } from "db/interfaces/stop_request";
import type { IPublishResult } from "db/query.utils";

import { Session, config } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_2a, req_fcrt_2c, req_fcrt_3b, req_fcrt_3c } from "./request";

import * as IPos from "db/interfaces/instrument_position";
import * as StopRequest from "db/interfaces/stop_request";
import * as StopOrder from "db/interfaces/stops";

const args = process.argv.slice(2); // get account id

if (args.length) {
  const test = args[1] || "2c";
  const request: Array<Partial<IStopRequest>> = test === "2a" ? [req_fcrt_2a] : test === "2c" ? [req_fcrt_2c] : test === "3b" ? [req_fcrt_3b] : req_fcrt_3c;

  const submit = async (request: Partial<IStopRequest>): Promise<IPublishResult<IStopRequest>> => {
    await config({ account: hexify(args[0]) });
    console.log("[Info] App.Config:", Session().Log(false));
    console.log(`-> Test ${test}: Submitting stop loss request without order for account ${args[0]}`);

    const instrument_position = await IPos.Key({ account: Session().account, symbol: request.symbol, position: request.position });
    const submitted = await StopRequest.Submit({ ...request, instrument_position, memo: `Test ${test}: submit stop loss request no order` });
    console.log({ submitted, request });
    return submitted;
  };

  request.map( async (req) => {
    await submit(req)
      .then(async (submitted) => {
        if (submitted === undefined) {
          console.error(Session());
          console.error(`Test ${test}: Request submission failed.`);
          console.error("Check if the request was already submitted or if there was an error in the submission process.");
          console.error("Request details:", req);
          console.error("Exiting process with code 1.");
          process.exit(1);
        }
        await StopOrder.Fetch({ stop_request: submitted?.key?.stop_request }).then((orders) => {
          if (orders && orders.length > 0) {
            console.log(`[Info] Test ${test}: Request submitted, check db for results.`, submitted);
            console.log(`[Info] Fetched order from DB:`, orders);
          } else {
            console.error(`Test ${test}: No order fetched from DB.`);
          }
          process.exit(0);
        });
      })
      .catch((error) => {
        console.error(`Test ${test}: Error during request submission:`, error);
        process.exit(1);
      });
  });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//