"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const Candle = __importStar(require("@db/interfaces/candle"));
const Instrument = __importStar(require("@db/interfaces/instrument"));
const Broker = __importStar(require("@db/interfaces/broker"));
const Role = __importStar(require("@db/interfaces/role"));
const Contract = __importStar(require("@db/interfaces/contract_type"));
const Currency = __importStar(require("@db/interfaces/currency"));
const Type = __importStar(require("@db/interfaces/instrument_type"));
const Period = __importStar(require("@db/interfaces/period"));
const State = __importStar(require("@db/interfaces/state"));
const Detail = __importStar(require("@db/interfaces/instrument_detail"));
const User = __importStar(require("@db/interfaces/user"));
const KeySet = __importStar(require("@db/interfaces/instrument_period"));
const Area = __importStar(require("@db/interfaces/subject"));
const Environ = __importStar(require("@db/interfaces/environment"));
const Account = __importStar(require("@db/interfaces/account"));
const std_util_1 = require("@lib/std.util");
const crypto_util_1 = require("./lib/crypto.util");
var Subject;
(function (Subject) {
    Subject["Account"] = "-a";
    Subject["Instrument"] = "-i";
    Subject["Contract"] = "-ctype";
    Subject["Currency"] = "-$";
    Subject["Type"] = "-itype";
    Subject["Period"] = "-p";
    Subject["Detail"] = "-d";
    Subject["State"] = "-s";
    Subject["KeySet"] = "-K";
    Subject["Bars"] = "-bars";
    Subject["Broker"] = "-b";
    Subject["Role"] = "-r";
    Subject["User"] = "-u";
    Subject["Login"] = "-login";
    Subject["Area"] = "-area";
    Subject["Environ"] = "-e";
})(Subject || (Subject = {}));
async function show(subject, args) {
    console.log(subject, args);
    switch (subject) {
        case Subject.Broker: {
            const props = (0, std_util_1.parseJSON)(args);
            props.broker && Object.assign(props, Object.assign(Object.assign({}, props), { broker: (0, crypto_util_1.hexify)(props.broker) }));
            const key = await Broker.Key(props);
            console.log("Fetch Broker:", props, key);
            return "ok";
        }
        case Subject.Bars: {
            const props = (0, std_util_1.parseJSON)(args);
            const instrument = await Instrument.Key({ symbol: props.symbol });
            const period = await Period.Key({ timeframe: props.timeframe });
            const bars = await Candle.Fetch(Object.assign(Object.assign({}, props), { instrument: instrument, period: period }));
            console.log("Fetch filtered period:", props, bars);
            return "ok";
        }
        case Subject.Contract: {
            const props = (0, std_util_1.parseJSON)(args);
            props.contract_type && Object.assign(props, Object.assign(Object.assign({}, props), { contract_type: (0, crypto_util_1.hexify)(props.contract_type) }));
            const key = await Contract.Key(props);
            console.log("Fetch contract:", props, key);
            return "ok";
        }
        case Subject.Currency: {
            const props = (0, std_util_1.parseJSON)(args);
            props.currency && Object.assign(props, Object.assign(Object.assign({}, props), { currency: (0, crypto_util_1.hexify)(props.currency) }));
            const key = await Currency.Key(props);
            console.log("Fetch currency:", props, key);
            return "ok";
        }
        case Subject.Instrument: {
            const props = (0, std_util_1.parseJSON)(args);
            props.instrument && Object.assign(props, Object.assign(Object.assign({}, props), { instrument: (0, crypto_util_1.hexify)(props.instrument) }));
            const row = await Instrument.Fetch(props);
            console.log("Fetch Instrument", { props, row });
            return "ok";
        }
        case Subject.Type: {
            const props = (0, std_util_1.parseJSON)(args);
            props.instrument_type && Object.assign(props, Object.assign(Object.assign({}, props), { instrument_type: (0, crypto_util_1.hexify)(props.instrument_type) }));
            const key = await Type.Key(props);
            console.log("Fetch type:", props, key);
            return "ok";
        }
        case Subject.Period: {
            const props = (0, std_util_1.parseJSON)(args);
            props.period && Object.assign(props, Object.assign(Object.assign({}, props), { period: (0, crypto_util_1.hexify)(props.period) }));
            const key = await Period.Key(props);
            console.log("Fetch period:", props, key);
            return "ok";
        }
        case Subject.Role: {
            const props = (0, std_util_1.parseJSON)(args);
            props.role && Object.assign(props, Object.assign(Object.assign({}, props), { role: (0, crypto_util_1.hexify)(props.role) }));
            const key = await Role.Key(props);
            console.log("Fetch Role:", props, key);
            return "ok";
        }
        case Subject.State: {
            const props = (0, std_util_1.parseJSON)(args);
            props.state && Object.assign(props, Object.assign(Object.assign({}, props), { state: (0, crypto_util_1.hexify)(props.state) }));
            const key = await State.Key(props);
            console.log("Fetch state:", props, key);
            return "ok";
        }
        case Subject.Area: {
            const props = (0, std_util_1.parseJSON)(args);
            props.subject && Object.assign(props, Object.assign(Object.assign({}, props), { subject: (0, crypto_util_1.hexify)(props.subject) }));
            const key = await Area.Fetch(props);
            console.log("Fetch Subject:", props, key);
            return "ok";
        }
        case Subject.Environ: {
            const props = (0, std_util_1.parseJSON)(args);
            props.environment && Object.assign(props, Object.assign(Object.assign({}, props), { environment: (0, crypto_util_1.hexify)(props.environment) }));
            const key = await Environ.Fetch(props);
            console.log("Fetch Environments:", props, key);
            return "ok";
        }
        case Subject.User: {
            const props = (0, std_util_1.parseJSON)(args);
            props.user && Object.assign(props, Object.assign(Object.assign({}, props), { user: (0, crypto_util_1.hexify)(props.user) }));
            const key = await User.Key(props);
            console.log("Fetch User:", props, key);
            return "ok";
        }
        case Subject.Login: {
            const props = (0, std_util_1.parseJSON)(args);
            const logged = await User.Login(props);
            console.log("Fetch User:", props, logged, logged ? "Success" : "Error");
            return "ok";
        }
        case Subject.Account: {
            const props = (0, std_util_1.parseJSON)(args);
            const key = await Account.Key(props);
            console.log("Fetch Account:", props, key);
            return "ok";
        }
        case Subject.Detail: {
            const props = (0, std_util_1.parseJSON)(args);
            const key = await Detail.Key(props);
            console.log("Fetch detail:", props, key);
            return "ok";
        }
        case Subject.KeySet: {
            const props = (0, std_util_1.parseJSON)(args);
            const key = await KeySet.Fetch(props);
            console.log("Fetch filtered period:", props, key);
            return "ok";
        }
    }
    return "error";
}
const [cli_subject] = process.argv.slice(2);
const [cli_props] = process.argv.slice(3);
const [cli_extended_props] = process.argv.slice(4);
async function run() {
    const run = await show(cli_subject, cli_props);
    process.exit(0);
}
run();
