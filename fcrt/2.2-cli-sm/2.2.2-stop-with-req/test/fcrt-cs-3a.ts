//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "db/interfaces/request";

import { Session, setSession } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_3a } from "./request";
import { Select } from "db/query.utils";

import * as IPos from "db/interfaces/instrument_position";
import * as Requests from "db/interfaces/request";
import * as Orders from "db/interfaces/order";

interface TAuditRequest {
  account: Uint8Array;
  instrument_position: Uint8Array;
  instrument: Uint8Array;
  position: "Long" | "Short" | "Net";
  symbol: string;
  base_currency: Uint8Array;
  base_symbol: string;
  quote_currency: Uint8Array;
  quote_symbol: string;
  state: Uint8Array;
  status: string;
  occurs: number;
}

const [cli_account] = process.argv.slice(2);

if (cli_account) {
  setSession({ account: hexify(cli_account) });

  const submit = async () => {
    const instrument_position = await IPos.Key({ account: Session().account, symbol: req_fcrt_3a.symbol, position: req_fcrt_3a.position });
    const audit = await Select<TAuditRequest>({ instrument_position }, { table: "vw_audit_requests" });
    const valid = audit.filter((ipos) => ["Queued", "Pending", "Hold", "Rejected"].includes(ipos.status!) && ipos.occurs! > 0);
    
    if (valid.length > 0) {
      const request = await Orders.Fetch({ status: "Pending" });
      if (request) {
        const [current] = request;
        const submitted = await Requests.Submit({
          ...current,
          ...req_fcrt_3a,
          memo: `Test 3a: set new expiry time for quick elapse; resubmitted`,
          update_time: new Date(),
        });
        console.log(`[Info] Starting Order: submitting request [req_fcrt_3a]`, { account: Session().account, instrument_position, ...req_fcrt_3a });
        return [submitted, { ...req_fcrt_3a, memo: `Test 3a: Correcting Order: Clears Rejected status; resubmitted` }];
      }
    } else {
      throw new Error(`[Error] Pending Order not found: One (1) order for [${req_fcrt_3a.symbol}/${req_fcrt_3a.position}] is required for test 3a;`);
    }
    throw new Error(`[Error] No Orders Found: One (1) order for [${req_fcrt_3a.symbol}/${req_fcrt_3a.position}] is required for test 3a;`);
  };

  console.log(`Test 3a: set expiry time to '5m' from now; resubmit existing pending order if found.`);

  submit()
    .then(async ([submitted, request]) => {
      if (submitted === undefined) {
        console.error(`Test 3a: Request submission failed.`);
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted! } as Partial<IRequest>).then((order) => {
        console.log(`Test 3a: Request submitted, check db for results.`, submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Test 3a: Error during request submission:`, error);
      process.exit(1);
    });
} else console.error("[Error] Account and Test Id missing from parameter list");
//-----------------------------------------------------------------------------------------------------//
