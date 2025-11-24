//----------------------------- Seed Load Tests ---------------------------------------//
import { Session, config } from "module/session";
import { hexify } from "lib/crypto.util";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import * as Seed from "cli/interfaces/seed";

//-- Configure Seed Account
const account = process.env.SEED_ACCOUNT || '24597a';
config({ account: hexify(account) });

console.log(`-- Seed Account:`, Session());

//-- Execute Seed Import
Seed.Import();
