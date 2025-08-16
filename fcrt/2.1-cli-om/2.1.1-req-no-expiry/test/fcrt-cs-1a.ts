//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "@db/interfaces/request";

import { setSession } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { req_fcrt_1a } from "./request";

import * as Requests from "@db/interfaces/request";

setSession({ account: hexify("145a6a") });

const submit = async (request: Partial<IRequest>) => {
  const submitted = await Requests.Submit(request);
  console.log({ submitted, request });
  return [submitted, request];
};

submit(req_fcrt_1a)
  .then(([submitted, request]) => {
    if (submitted === undefined) {
      console.error("Test 1: Request submission failed.");
      console.error("Check if the request was already submitted or if there was an error in the submission process.");
      console.error("Request details:", request);
      console.error("Exiting process with code 1.");
      process.exit(1);
    }
    console.log("Test 1: Request submitted, check db for results.", submitted);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test 1: Error during request submission:", error);
    process.exit(1);
  });
//-----------------------------------------------------------------------------------------------------//
