import mysql from 'mysql2';

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'blofin_user',
    password: 'blofin123',
    database: 'blofin',
});

connection.connect((err) => {
    if (err) {
        console.log('Failed to connect to Blofin DB', err);
        throw err;
    }

    console.log('Connected to Blofin DB');

    connection.query('SELECT * FROM contract_type;', (err, results) => {
        if (err) {
            console.log('Error accessing Blofin DB contract_type', err)
            throw err;
        }

        console.log(results);

        connection.end();
    })
})