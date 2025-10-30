//----------------------------- stop order test  -------------------------------------------------------//
import type { IStops } from "db/interfaces/stops";

import { setSession, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_1a } from "./request";

import * as IPos from "db/interfaces/instrument_position";
import * as Stops from "db/interfaces/stops";

const args = process.argv.slice(2); // get account id

if (args.length) {
  setSession({ account: hexify(args[0]) });

  const submit = async (request: Partial<IStops>) => {
    const instrument_position = await IPos.Key({ account: Session().account, symbol: req_fcrt_1a.symbol, position: req_fcrt_1a.position });
    const submitted = await Stops.Submit({ ...request, instrument_position, memo: "Test 1a: submit stop loss order request without tpsl" });
    console.log({ submitted, request });
    return [submitted, request];
  };

  submit(req_fcrt_1a)
    .then(async ([submitted, request]) => {
      if (submitted === undefined) {
        console.error(Session());
        console.error("Test 1a: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Stops.Fetch({ stop_request: submitted! } as Partial<IStops>).then((order) => {
        console.log("Test 1a: Request submitted, check db for results.", submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test 1a: Error during request submission:", error);
      process.exit(1);
    });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
