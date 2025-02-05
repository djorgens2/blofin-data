import * as candles from './api/candles';
import * as instruments from './api/instruments';
// import { load } from 'ts-dotenv';

// const env = load({
//     DB_HOST: String,
//     DB_USER: String,
//     DB_PASSWORD: String,
//     DB_SCHEMA: String,
//     DB_PORT: Number
// })

// console.log(process.env.DB_HOST);
// console.log(process.env.DB_USER);

//candles.Import("ENA-USDT","15m");
instruments.Import();

