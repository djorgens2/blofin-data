import { Select, Modify, UniqueKey } from "../query.utils";
import { RowDataPacket } from "mysql2";

export interface ICandle extends RowDataPacket {
    instrument: number;
    period_type: number;
    bar_time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    currency: number,
    currency_quote : number,
    completed: boolean
};