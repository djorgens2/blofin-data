//----------------------------- IPos Load Test ---------------------------------------//
import type { IInstrumentPosition } from "db/interfaces/instrument_position";

import { Session, config } from "module/session";
import { hexify } from "lib/crypto.util";

import * as IPos from "db/interfaces/instrument_position";

const args = process.argv.slice(2); // get account id

if (args.length) {
  config({ account: hexify(args[0]) });

  const importIPos = async () => {
    const promise = IPos.Import();
        const [accepted, rejected, suspended] = await promise;
        console.log(`Test 2a: IPos Import Results: Accepted: ${accepted.length}, Rejected: ${rejected.length}, Suspended: ${suspended.length}`);
        
    return [accepted, rejected, suspended];
  };
  
  importIPos()
  .then(async ([accepted, rejected, suspended]) => {
    if (accepted+rejected+suspended === 0) {
        console.error(Session());
        console.error("Test 2a: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted! } as Partial<IRequest>).then((order) => {
        console.log("Test 2a: Request submitted, check db for results.", submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test 2a: Error during request submission:", error);
      process.exit(1);
    });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
