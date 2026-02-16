//----------------------------- Instrument Baseline Test-------------------------------------------//
import { Session, config } from "module/session";
import { hexify } from "lib/crypto.util";

import * as Import from "app/import";

const account = hexify(process.env.account || process.env.SEED_ACCOUNT || `???`);
config({ account }, `Import`)
  .then(async () => {
    console.log(Session().Log(true));
  })
  .finally(async () => {
    await Import.importCandles()
      .then(() => {
        console.log("[Info] Import.Candles: Successfully completed");
        process.exit(0);
      })
      .catch((e) => {
        console.log("[Error] Import.Candles: Failed to complete successfully");
        process.exit(1);
      });
  });
