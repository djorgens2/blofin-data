//----------------------------- order test  -------------------------------------------------------//
import type { TRefKey } from "db/interfaces/reference";
import type { IRequest } from "db/interfaces/request";

import { setSession, Session, ISession } from "module/session";
import { hexify } from "lib/crypto.util";

import { req_fcrt_3a } from "./request";

import * as IPos from "db/interfaces/instrument_position";
import * as Orders from "db/interfaces/order";
import * as Requests from "db/interfaces/request";
import * as References from "db/interfaces/reference";
import * as Accounts from "db/interfaces/account";

const args = process.argv.slice(2); // get account id
const config = async (props: Partial<Accounts.IAccount>) => {
  const [search] = await Accounts.Fetch(props) ?? [undefined];

  if (search) {
    const keys: Array<ISession> = process.env.APP_ACCOUNT ? JSON.parse(process.env.APP_ACCOUNT!) : [``];
    const props = keys.find(({ alias }) => alias === search.alias);

    if (props) {
      const { api, secret, phrase, rest_api_url, private_wss_url, public_wss_url } = props;
      setSession({
        account: search.account,
        state: "testing",
        audit_order: "0",
        audit_stops: "0",
        api,
        secret,
        phrase,
        rest_api_url,
        private_wss_url,
        public_wss_url,
      });
    }
  }
};

const submit = async (request: Partial<IRequest>) => {
  await config({ account: hexify(args[0]) });

  const instrument_position = await IPos.Key({ account: Session().account, symbol: req_fcrt_3a.symbol, position: req_fcrt_3a.position });
  const request_type = await References.Key<TRefKey>({ source_ref: req_fcrt_3a.order_type }, { table: `request_type` });
  const submitted = await Requests.Submit({
    ...request,
    instrument_position,
    request_type,
    memo: request.memo || "Test 3a: leverage live merge test;",
  });
  return [submitted, request];
};

if (args.length) {
  submit(req_fcrt_3a)
    .then(async ([submitted, request]) => {
      if (submitted === undefined) {
        console.error(Session());
        console.error("Test 3a: Request submission failed.");
        console.error("Check if the request was already submitted or if there was an error in the submission process.");
        console.error("Request details:", request);
        console.error("Exiting process with code 1.");
        process.exit(1);
      }
      await Orders.Fetch({ request: submitted! } as Partial<IRequest>).then((order) => {
        console.log("Test 3a: Request submitted, check db for results.", submitted);
        console.log("Fetched order from DB:", order);
      });
      process.exit(0);
    })
    .catch((error) => {
      console.error("Test 3a: Error during request submission:", error);
      process.exit(1);
    });
} else console.error("[Error] Account must be passed as first parameter");
//-----------------------------------------------------------------------------------------------------//
