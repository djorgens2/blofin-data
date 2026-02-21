//----------------------------- order test  -------------------------------------------------------//
import { setSession, Session } from "#module/session";
import { hexify } from "#lib/crypto.util";
import { req_fcrt_3a } from "./request";

import * as Requests from "#db/interfaces/request";
import * as Orders from "#db/interfaces/order";

const args = process.argv.slice(2); // get account id

const cancel = async () => {
  const cancels = await Orders.Fetch({ account: Session().account, symbol: req_fcrt_3a.symbol, status: "Pending" });

  if (cancels) {
    if (cancels.length > 1) {
      console.log(`[Error] Test 3a: Too many cancels, expected one but got .`, cancels.length);
      process.exit(1);
    }

    const [cancel] = cancels;
    const canceled = await Requests.Cancel({ request: cancel.request, account: cancel.account, memo: "Test 3a: Success! Canceled pending request locally." });
    return canceled;
  } else {
    console.log("[Error] Something broke; check your logs", cancels);
    return [];
  }
};

if (args.length) {
  setSession({ account: hexify(args[0]) });
  cancel()
    .then((canceled) => {
      if (canceled.length) {
        const [result] = canceled;
        console.log(result.response.success ? "[Info] Test 3a: Request canceled, check db for results." : "[Error] Test 3a: Something choked up; check db/log");
        for (const request of canceled)
          console.log({
            account: Session().account,
            request,
            symbol: req_fcrt_3a.symbol,
            status: "Canceled",
          });
        process.exit(0);
      }
      console.log("Test 3a: Request cancellation failed.");
      console.log("Check if the cancellation was already processed or if there was an error in the submission process.");
      console.log("Request details:", req_fcrt_3a, canceled);
      console.log("Exiting process with code 1.");
      process.exit(1);
    })
    .catch((error) => {
      console.log("Test 3a: Error during request cancellation:", error);
      process.exit(1);
    });
}
//-----------------------------------------------------------------------------------------------------//
