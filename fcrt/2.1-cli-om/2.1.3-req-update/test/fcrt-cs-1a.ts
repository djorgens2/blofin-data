//----------------------------- order test  -------------------------------------------------------//
import type { IRequest } from "#db/interfaces/request";
import type { IPublishResult } from "#api";

import { Session, setSession } from "#module/session";
import { hexify } from "#lib/crypto.util";
import { Select } from "#db/query.utils";

import * as IPos from "#db/interfaces/instrument_position";
import * as Requests from "#db/interfaces/request";
import * as Orders from "#db/interfaces/order";
import * as Request from "./request";

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

  const submit = async (): Promise<[IPublishResult<IRequest>, Partial<IRequest>]> => {
    const instrument_position = await IPos.Key({ account: Session().account, symbol: Request.req_fcrt_1a.symbol, position: Request.req_fcrt_1a.position });
    const audit = await Select<TAuditRequest>({ instrument_position }, { table: "vw_audit_requests" });
    const valid = audit.data?.filter((ipos) => ["Queued", "Pending", "Hold", "Rejected"].includes(ipos.status!) && ipos.occurs! > 0);

    console.log({ instrument_position });

    if (!valid || !valid?.length) throw new Error("[Error] No matching order")

    if (cli_test === "1a") {
      if (valid?.length === 0) {
        const submitted = await Requests.Submit({ ...Request.req_fcrt_1a, memo: `Test ${cli_test}: Starting Order: Results in Rejected status` });
        console.log(`[Info] Starting Order: submitting request [Request.req_fcrt_1a]`, {
          account: Session().account,
          instrument_position,
          ...Request.req_fcrt_1a,
        });
        return [submitted, { ...Request.req_fcrt_1a, memo: `Test ${cli_test}: Starting Order: Results in Rejected status` }];
      }
      throw new Error(`[Error] No Order: Test ${cli_test} failed; Active request exists for this instrument;`);
    } else if (valid?.length > 0) {
      //   const queued = await Orders.Fetch({ status: "Queued" });
      if (cli_test === "1b") {
        const request = await Orders.Fetch({ status: "Rejected" });
        if (request) {
          const [current] = request;
          const submitted = await Requests.Submit({
            ...current,
            ...Request.req_fcrt_1b,
            memo: `Test ${cli_test}: Correcting Order: Clears Rejected status; resubmitted`,
            update_time: new Date(),
          });
          console.log(`[Info] Starting Order: submitting request [Request.req_fcrt_1b]`, {
            account: Session().account,
            instrument_position,
            ...Request.req_fcrt_1b,
          });
          return [submitted, Request.req_fcrt_1b];
        }
        throw new Error(
          `[Error] No Order: Test ${cli_test} failed; Rejected request does not exist for [${Request.req_fcrt_1a.symbol}/${Request.req_fcrt_1a.position}];`,
        );
      }
      if (cli_test === "1c") {
        const request = await Orders.Fetch({ status: "Pending" });
        if (request) {
          const [current] = request;
          const submitted = await Requests.Submit({
            ...current,
            ...Request.req_fcrt_1c,
            memo: `Test ${cli_test}: Reduction Order: Updated to hold;`,
            update_time: new Date(),
          });
          console.log(`[Info] Request.Submit: submitting request [Request.req_fcrt_1c]`, {
            account: Session().account,
            instrument_position,
            ...Request.req_fcrt_1c,
          });
          return [submitted, Request.req_fcrt_1c];
        }
        throw new Error(`[Error] No Order: Test ${cli_test} failed; request does not exist for this instrument;`);
      }
      if (cli_test === "1d") {
        const request = await Orders.Fetch({ status: "Pending" });
        if (request) {
          const [current] = request;
          const submitted = await Requests.Submit({
            ...current,
            ...Request.req_fcrt_1d,
            memo: `Test ${cli_test}: Updating Order: setting expiry to 1m;`,
            update_time: new Date(),
          });
          console.log(`[Info] Starting Order: submitting request [Request.req_fcrt_1d]`, {
            account: Session().account,
            instrument_position,
            ...Request.req_fcrt_1d,
          });
          return [submitted, Request.req_fcrt_1d];
        }
        throw new Error(`[Error] No Order: Test ${cli_test} failed; request does not exist for this instrument;`);
      }
      throw new Error(`[Error] Invalid Test: ${cli_test} does not exist;`);
    }
    throw new Error(
      `[Error] Existing Order Found: Only One (1) order for [${Request.req_fcrt_1a.symbol}/${Request.req_fcrt_1a.position}] is permitted for test ${cli_test};`,
    );
  };

  console.log(`Test ${cli_test}: request reject on size, resub, then edit and resub`);

  submit()
    .then(async ([submitted, request]) => {
      if (submitted === undefined) {
        console.error(`Test ${cli_test}: Request submission failed.`);
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted.key?.request } as Partial<IRequest>).then((order) => {
        console.log(`Test ${cli_test}: Request submitted, check db for results.`, submitted);
        console.log("Fetched order from DB:", submitted, order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error(`Test ${cli_test}: Error during request submission:`, error);
      process.exit(1);
    });
} else console.error("[Error] Account and Test Id missing from parameter list");
//-----------------------------------------------------------------------------------------------------//
