import type { RowDataPacket } from 'mysql2';
import { Select, Modify } from '../query.utils';

interface IContractType extends RowDataPacket {
    contract_type: number;
    description: string;
    short_name: string;
}

export function all() {
    return Select<IContractType>(`SELECT * FROM contract_type;`);
};

export function bySourceRef(SourceRef: string) {
    return Select<IContractType>(`SELECT * FROM contract_type WHERE source_ref=${SourceRef};`);
}

export function add(Description: string, SourceRef: string) {
    return Modify(`INSERT INTO contract_type (description, short_name) VALUES ('${Description}','${SourceRef}');`)
}