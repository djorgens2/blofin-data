//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "@db/interfaces/request";

import { setSession } from "@module/session";
import { hexify } from "@lib/crypto.util";
import { req_fcrt_1a } from "fcrt/2.1-cli-om/2.1.1-req-no-expiry/test/request";

import * as Requests from "@db/interfaces/request";
import { setAccount } from "@cli/interfaces/account";

setSession({ account: hexify("23334e") });

const cancel = async (request: Partial<IRequest>) => {
  const canceled = await Requests.Cancel(request);
  return canceled;
};

cancel({ symbol: req_fcrt_1a.symbol, status: "Pending" })
  .then((canceled) => {
    if (canceled.length) {
      console.log("Test 2: Request canceled, check db for results.");
      for (const cancel of canceled)
        console.log({
          account: cancel.account,
          request: cancel.request,
          symbol: req_fcrt_1a.symbol,
          status: 'Canceled',
          memo: cancel.memo,
        });
      process.exit(0);
    }
    console.log("Test 2: Request cancellation failed.");
    console.log("Check if the cancellation was already processed or if there was an error in the submission process.");
    console.log("Request details:", req_fcrt_1a, canceled);
    console.log("Exiting process with code 1.");
    process.exit(1);
  })
  .catch((error) => {
    console.log("Test 2: Error during request cancellation:", error);
    process.exit(1);
  });
//-----------------------------------------------------------------------------------------------------//
