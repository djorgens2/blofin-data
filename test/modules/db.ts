import mysql from 'mysql2';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'blofin_user',
    password: 'blofin123',
    database: 'blofin',
    connectionLimit: 10,
    maxIdle: 10,
});

interface IContractType extends RowDataPacket {
    contract_type: number;
    description: string;
    short_name: string;
}

pool.execute('SELECT * FROM contract_type;', (err, results) => {
    if (err) {
        console.log('Error accessing Blofin DB contract_type', err)
        throw err;
    }

    const contract_types = results as Array<Partial<IContractType>>;
    contract_types.forEach(type => console.log(type.description));

    //@ts-ignore
    console.log(results[0].description);
    console.log(contract_types);
});
