const express = require('express');
const app = express();

// const pg = require('pg');
// const pool = new pg.Pool({
// 	user: 'sysadmin',
// 	host: '127.0.0.1',
// 	database: 'mywebstore',
// 	password: '',
// 	port: '5432'
// });

// pool.query("SELECT NOW()", (err, res) => {
// 	console.log('Select Now result:', err, res);
// 	pool.end();
// });


const config = {
  user: 'postgres',
  password: '',
  port: 5432,
  host: 'localhost'
}

pgtools.createdb(config, 'test-db', function (err, res) {
  if (err) {
    console.error(err);
    process.exit(-1);
  }
  console.log('Created:', res);

  pgtools.dropdb(config, 'test-db', function (err, res) {
    if (err) {
      console.error(err);
      process.exit(-1);
    }
    console.log('Dropped:', res);
  });
});

app.get('/', (req, res) => {
  res.send('Hello, Test4!');
});

app.listen(8080, () => console.log('Listening on port 8080'));