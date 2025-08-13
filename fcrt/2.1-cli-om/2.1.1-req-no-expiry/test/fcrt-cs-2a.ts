//----------------------------- order test  -------------------------------------------------------//
import { setSession } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { req_fcrt_1a } from "fcrt/2.1-cli-om/2.1.1-req-no-expiry/test/request";

import * as Requests from "@db/interfaces/request";

setSession({ account: hexify("145a6a") });

Requests.Cancel({ symbol: req_fcrt_1a.symbol, status: "Pending" })  
  .then(({updated, errors}) => {
    if (updated.length === 0) {
      console.log("Test 1: Request cancellation failed.");
      console.log("Check if the cancellation was already processed or if there was an error in the submission process.");
      console.log("Request details:", errors);
      console.log("Exiting process with code 1.");
      process.exit(1);
    }
    console.log("Test 1: Request canceled, check db for results.", updated);
    process.exit(0);
  })
  .catch((error) => {
    console.log("Test 1: Error during request cancellation:", error);
    process.exit(1);
  });
//-----------------------------------------------------------------------------------------------------//
