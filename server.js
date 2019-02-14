const express = require('express');
const app = express();

const pg = require('pg');
const pool = new pg.Pool({
	user: 'postgres',
	password: 'postgres',
	host: 'mydb',
	database: 'second-example',
	port: '5432'
});

pool.query("SELECT NOW()", (err, res) => {
	console.log('Select Now result:', err, res);
	pool.end();
});

app.get('/', (req, res) => {
  res.send('Hello, Test4!');
});

app.listen(8080, () => console.log('Listening on port 8080'));