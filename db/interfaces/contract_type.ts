import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { Select, Modify } from '../query.utils';

interface IContractType extends RowDataPacket {
    contract_type: number;
    description: string;
    short_name: string;
    reference_key: string;
}

export function all() {
    return Select<IContractType>(`SELECT * FROM contract_type;`);
};

export function byRefKey(ReferenceKey: string) {
    return Select<IContractType>(`SELECT * FROM contract_type WHERRE reference_key=${ReferenceKey};`);
}

export function add(Description: string, ShortName: string, ReferenceKey: string) {
    return Modify(`INSERT INTO contract_type (description, short_name, reference_key) VALUES ('${Description}','${ShortName}','${ReferenceKey}');`)
}