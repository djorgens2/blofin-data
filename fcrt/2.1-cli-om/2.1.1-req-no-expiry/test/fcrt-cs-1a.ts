//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "@db/interfaces/request";

import { setSession } from "@module/session";
import { hexify } from "@lib/crypto.util";

import * as Requests from "@db/interfaces/request";

//-- Test 1: request w/o expiry; w/o tpsl
const req_fcrt_1a: Partial<IRequest> = {
  symbol: "XRP-USDT",
  margin_mode: "cross",
  position: "short",
  action: "sell",
  order_type: "limit",
  price: 3.5,
  size: 100,
  leverage: 50,
  memo: "Test 1: request w/o expiry; w/o tpsl",
};

setSession({ account: hexify("145a6a") });

const submit = async (request: Partial<IRequest>) => {
  const op = await Requests.Submit(request);
  console.log({ op, request });
  return [op, request];
};

submit(req_fcrt_1a)
  .then(([op, request]) => {
    if (op === undefined) {
      console.error("Test 1: Request submission failed.");
      console.error("Check if the request was already submitted or if there was an error in the submission process.");
      console.error("Request details:", request);
      console.error("Exiting process with code 1.");
      process.exit(1);
    }
    console.log("Test 1: Request submitted, check db for results.", op);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Test 1: Error during request submission:", error);
    process.exit(1);
  });
//-----------------------------------------------------------------------------------------------------//
