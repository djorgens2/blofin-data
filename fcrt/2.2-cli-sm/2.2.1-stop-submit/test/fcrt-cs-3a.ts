//----------------------------- stop order test  -------------------------------------------------------//
import type { IStops } from "db/interfaces/stops";

import { setSession, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_3a } from "./request";

import * as IPos from "db/interfaces/instrument_position";
import * as Stops from "db/interfaces/stops";

const args = process.argv.slice(2); // get account id

if (args.length) {
  setSession({ account: hexify(args[0]) });

  const submit = async (requests: Array<Partial<IStops>>) => {
    const submits = [];

    for (const request of requests) {
      const instrument_position = await IPos.Key({ account: Session().account, symbol: request.symbol, position: request.position });
      const submitted = await Stops.Submit({ ...request, instrument_position, memo: "Test 3a: submit stop loss request no order" });
      submits.push(submitted);
    }
    console.log({ submits, requests });
    return [submits, requests];
  };

  submit(req_fcrt_3a)
    .then(async ([submitted, request]) => {
      if (submitted === undefined) {
        console.error(Session());
        console.error("Test 3a: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }

      for (const stop_request of submitted)
      await Stops.Fetch({ stop_request } as Partial<IStops>).then((request) => {
        console.log("Test 3a: Request submitted, check db for results.", submitted);
        console.log("Fetched order from DB:", request);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test 3a: Error during request submission:", error);
      process.exit(1);
    });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
