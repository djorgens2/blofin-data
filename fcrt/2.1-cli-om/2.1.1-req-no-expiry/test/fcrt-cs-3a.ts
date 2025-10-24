//----------------------------- order test  -------------------------------------------------------//
import { setSession, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_1a } from "fcrt/2.1-cli-om/2.1.1-req-no-expiry/test/request";

import * as Requests from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

setSession({ account: hexify("24597a") });

const cancel = async () => {
  const cancels = await Orders.Fetch({ account: Session().account, symbol: req_fcrt_1a.symbol, status: "Pending" });

  if (cancels) {
    if (cancels.length > 1) {
      console.log(`Test 2: Too many cancels, expected one but got .`, cancels.length);
      process.exit(1);
    }

    const [cancel] = cancels!;
    const canceled = await Requests.Cancel({ request: cancel.request, account: cancel.account, memo: "Test 3: Success! Canceled pending request locally." });
    return canceled;
  } else {
    console.error("Something broke; check your logs", cancels)
    return [];
  }
};

cancel()
  .then((canceled) => {
    if (canceled.length) {
      console.log("Test 3: Request canceled, check db for results.");
      for (const cancel of canceled)
        console.log({
          account: Session().account,
          request: cancel,
          symbol: req_fcrt_1a.symbol,
          status: "Canceled",
        });
      process.exit(0);
    }
    console.log("Test 3: Request cancellation failed.");
    console.log("Check if the cancellation was already processed or if there was an error in the submission process.");
    console.log("Request details:", req_fcrt_1a, canceled);
    console.log("Exiting process with code 1.");
    process.exit(1);
  })
  .catch((error) => {
    console.log("Test 3: Error during request cancellation:", error);
    process.exit(1);
  });
//-----------------------------------------------------------------------------------------------------//
