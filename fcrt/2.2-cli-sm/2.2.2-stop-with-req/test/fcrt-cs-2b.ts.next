//----------------------------- stop order test  -------------------------------------------------------//
import type { IStops } from "db/interfaces/stops";

import { setSession, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_2b } from "./stops";

import * as IPos from "db/interfaces/instrument_position";
import * as Stops from "db/interfaces/stops";

const args = process.argv.slice(2); // get account id

if (args.length) {
  setSession({ account: hexify(args[0]) });

  const submit = async (requests: Array<Partial<IStops>>) => {
    const submitted = [];
    for (const request of requests) {
      console.log("Submitting stop request:", request);
      const instrument_position = await IPos.Key({ account: Session().account, symbol: request.symbol, position: request.position });
      const result = await Stops.Submit({ ...request, instrument_position, memo: request.memo || "Test 2b: submit stop request no order" });
      console.log({ result, request });
      result && submitted.push(result);
    }
      return submitted;
  };

  submit(req_fcrt_2b)
    .then(async (submitted) => {
      if (submitted === undefined) {
        console.error(Session());
        console.error("Test 2b: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Request details:", req_fcrt_2b);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Stops.Fetch({ status: "Queued" } as Partial<IStops>).then((stops) => {
        console.log("Test 2b: Stop requests submitted, check db for results.", submitted);
        console.log("Fetched stops from DB:", stops);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test 2b: Error during request submission:", error);
      process.exit(1);
    });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
