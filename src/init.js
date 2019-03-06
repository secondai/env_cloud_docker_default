// if(process.env.NEW_RELIC_LICENSE_KEY){
//   require('newrelic');
// }

// Initiates global models, caches, etc. 
// Start Second

const lodash = require('lodash');

if(process.env.SHOW_ENV == '1'){
  console.log('ENV:', process.env);
}


// const express = require('express');
// const app = express();

// const pg = require('pg');
// const pool = new pg.Pool({
//   user: 'postgres',
//   host: 'mydb',
//   database: 'seconddb',
//   password: 'postgres',
//   port: 5432
// });

// pool.query("SELECT NOW()", (err, res) => {
//   console.log('Select Now result:', err, res);
//   pool.end();
// });

// app.get('/', (req, res) => {
//   res.send('Hello, Test15!');
// });

// app.listen(8080, () => console.log('Listening on port 8080'));


// // Check for required environment variables 
// // - TODO: load fom config file shipped with environment 
// let expectedEnvVars = [
//   // ['DEFAULT_LAUNCH_PATH'],
//   // ['STELLAR_NETWORK'],
//   // ['PORT'],
// ];
// let foundEnvVars = Object.keys(process.env).map(k=>{return {k, v: process.env[k]}});
// if(expectedEnvVars.filter(varBox=>{
//     let varName = varBox[0];
//     if(varBox.length == 1){
//       // name same as string 
//       if(!lodash.find(foundEnvVars, {k:varName})){
//         console.error('Missing ENV:', varName);
//         return true;
//       }
//     } else {
//       // TODO: run conditional check (should support "x or (y and z)" type of logic 
//       // let varQuery = varBox[1];
//     }
//     return false;
//   }).length){
//   console.log('Var:', varBox);
//   throw '--Not Launching, missing environment variable--'
// }

let App = {};
global.App = App;
App.globalCache = {};
App.sharedServices = {};



//////////////////
// System watcher 
// - memory usage
//////////////////

// const si = require('systeminformation');
// var usage = require('usage');

// // restart/kill if memory exceeded significantly 
// setInterval(async function(){
//   let total = parseInt(process.env.WEB_MEMORY || '1024',10);
//   total = total * (1024 * 1024); // mb to bytes

//   // linux-only (expecting heroku) 
//   var pid = process.pid // you can use any valid PID instead
//   usage.lookup(pid, function(err, result) {
//     if(err){
//       return console.error('usage lookup err:', err);
//     }
//     let mem = result.memory;

//     console.log('Mem:', Math.round((mem/total)*100), 'Used:', mem, 'Total:', total);

//   });

// },5 * 1000);



//////////////////
// Logging
//////////////////

var util = require('util');
var winston = require('winston');
App.sharedServices.logger = new winston.Logger();
App.sharedServices.loggerStream = {
  write: function(message, encoding){
    console.info(message);
  }
};
App.sharedServices.logger.add(winston.transports.Console, {
  colorize: true,
  timestamp: false,
  handleExceptions: true,
  level: 'debug'
}); 
function formatArgs(args){
    return [util.format.apply(util.format, Array.prototype.slice.call(args))];
}
console.log = function(){
  App.sharedServices.logger.info.apply(App.sharedServices.logger, formatArgs(arguments));
};
console.info = function(){
  App.sharedServices.logger.info.apply(App.sharedServices.logger, formatArgs(arguments));
};
console.warn = function(){
  App.sharedServices.logger.warn.apply(App.sharedServices.logger, formatArgs(arguments));
};
console.error = function(){
  App.sharedServices.logger.error.apply(App.sharedServices.logger, formatArgs(arguments));
};
console.debug = function(){
  App.sharedServices.logger.debug.apply(App.sharedServices.logger, formatArgs(arguments));
};






//////////////////
//  Services for Universe
// - memory (persistent [nodes] and services/caches), vm execution environment 
//////////////////

// graphql (mongodb) 
// App.graphql = require('./graphql').default;
// sets up App.
let sequelizeDb = require('./db/_index');
App.sharedServices.db = sequelizeDb;
// App.sharedServices.graphql = App.graphql;

// sync db?
App.sharedServices.db.sequelize.sync().then(()=>{
  console.log('Synced DB');
  // App.sharedServices.db.sequelize.drop().then(()=>{
  //   console.log('dropped');
  // });

  // Second (autostarts) 
  App.secondAI = require('./ai');

})

// // redis (if necessary)
// if(process.env.REDIS_URL || process.env.REDIS_HOST){
//   App.redis = require("redis");

//   if(process.env.REDIS_URL){
//     App.redisClient = App.redis.createClient(process.env.REDIS_URL);
//   } else {
//     App.redisClient = App.redis.createClient(6379, process.env.REDIS_HOST || 'redis');
//   }
//   App.redisClient.on("error", function (err) {
//       console.error("Redis Error " + err);
//   });

//   App.sharedServices.redis = App.redis;
//   App.sharedServices.redisClient = App.redisClient;
// }

// // utils
// App.utils = require('./utils').default;


//////////////////
// Universe
// - run  
//////////////////

// const express = require('express');
// const app = express();

// app.get('/', async (req, res) => {

//   try {
//   }catch(err){
//     console.error(err);
//   }

//   let vals = await App.sharedServices.db.Node.findAll();
//   let output = lodash.map(vals,'name');
//   console.log('vals:', output);

//   res.send({vals});

// });

// app.listen(8080, () => console.log('Listening on port 8080'));


// // Second (autostarts) 
// App.secondAI = require('./ai');