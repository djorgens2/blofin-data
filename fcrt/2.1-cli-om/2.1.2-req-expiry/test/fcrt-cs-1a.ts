//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "db/interfaces/request";

import { config, Session } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_1a } from "./request";

import * as Requests from "db/interfaces/request";
import * as Orders from "db/interfaces/order";
import { IPublishResult } from "db/query.utils";


const [cli_account, cli_test] = process.argv.slice(2);

if (cli_account && cli_test) {
  
  const submit = async (request: Partial<IRequest>): Promise<[IPublishResult<IRequest>, Partial<IRequest>]> => {
    await config({ account: hexify(cli_account) });
    console.log(`-> Test ${cli_test}: Using Account:`, Session());

    const submitted = await Requests.Submit(request);
    console.log({ submitted, request });
    return [submitted, request];
  };

  submit({ ...req_fcrt_1a, memo: `Test ${cli_test}: request w/ expiry; w/o tpsl` })
    .then(async ([submitted, request]) => {
      if (!submitted.response.success) {
        console.error("Test 1: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Submitted Request details:", {submitted, request});
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted.key?.request } as Partial<IRequest>).then((order) => {
        console.log(`Test ${cli_test}: Request submitted, check db for results.`, submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Test ${cli_test}: Error during request submission:`, error);
      process.exit(1);
    });
} else console.error("[Error] Account and Test Id missing from parameter list");
//-----------------------------------------------------------------------------------------------------//
