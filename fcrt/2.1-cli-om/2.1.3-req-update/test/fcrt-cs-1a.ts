//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "db/interfaces/request";

import { Session, setSession } from "module/session";
import { hexify } from "lib/crypto.util";
import { req_fcrt_1a } from "./req_fcrt_1a";
import { req_fcrt_1b } from "./req_fcrt_1b";
import { req_fcrt_1c } from "./req_fcrt_1c";
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

const [cli_account, cli_test] = process.argv.slice(2);

if (cli_account && cli_test) {
  setSession({ account: hexify(cli_account) });

  const submit = async () => {
    const instrument_position = await IPos.Key({ account: Session().account, symbol: req_fcrt_1a.symbol, position: req_fcrt_1a.position });
    const audit = await Select<TAuditRequest>({ instrument_position }, { table: "vw_audit_requests" });
    const valid = audit.filter((ipos) => ["Queued", "Pending", "Hold", "Rejected"].includes(ipos.status!) && ipos.occurs! > 0);

    console.log({ instrument_position, audit, valid });

    if (cli_test === "1a") {
      if (valid.length === 0) {
        const submitted = await Requests.Submit({ ...req_fcrt_1a, memo: `Test ${cli_test}: Starting Order: Results in Rejected status` });
        console.log(`[Info] Starting Order: submitting request [req_fcrt_1a]`, { account: Session().account, instrument_position, ...req_fcrt_1a });
        return [submitted, { ...req_fcrt_1a, memo: `Test ${cli_test}: Starting Order: Results in Rejected status` }];
      }
      throw new Error(`[Error] No Order: Test ${cli_test} failed; Active request exists for this instrument;`);
    } else if (valid.length > 0) {
      //   const queued = await Orders.Fetch({ status: "Queued" });
      if (cli_test === "1b") {
        const request = await Orders.Fetch({ status: "Rejected" });
        if (request) {
          const [current] = request;
          const submitted = await Requests.Submit({
            ...current,
            ...req_fcrt_1b,
            memo: `Test ${cli_test}: Correcting Order: Clears Rejected status; resubmitted`,
            update_time: new Date(),
          });
          console.log(`[Info] Starting Order: submitting request [req_fcrt_1b]`, { account: Session().account, instrument_position, ...req_fcrt_1b });
          return [submitted, req_fcrt_1b];
        }
        throw new Error(`[Error] No Order: Test ${cli_test} failed; Rejected request does not exist for [${req_fcrt_1a.symbol}/${req_fcrt_1a.position}];`);
      }
      if (cli_test === "1c") {
        const request = await Orders.Fetch({ status: "Pending" });
        if (request) {
          const [current] = request;
          const submitted = await Requests.Submit({
            ...current,
            ...req_fcrt_1c,
            memo: `Test ${cli_test}: Updating Order: Updates to hold;`,
            update_time: new Date(),
          });
          console.log(`[Info] Starting Order: submitting request [req_fcrt_1c]`, { account: Session().account, instrument_position, ...req_fcrt_1c });
          return [submitted, req_fcrt_1c];
        }
        throw new Error(`[Error] No Order: Test ${cli_test} failed; request does not exist for this instrument;`);
      }
      throw new Error(`[Error] Invalid Test: ${cli_test} does not exist;`);
    }
    throw new Error(`[Error] Existing Order Found: Only One (1) order for [${req_fcrt_1a.symbol}/${req_fcrt_1a.position}] is permitted for test ${cli_test};`);
  };

  console.log(`Test ${cli_test}: request reject on size, resub, then edit and resub`);

  submit()
    .then(async ([submitted, request]) => {
      if (submitted === undefined) {
        console.error("Test 1: Request submission failed.");
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted! } as Partial<IRequest>).then((order) => {
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
