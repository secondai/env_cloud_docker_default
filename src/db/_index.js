var snake = require('to-snake-case');
var pluralize = require('pluralize')

if (!global.hasOwnProperty('db')) {
  var Sequelize = require('sequelize')
    , sequelize = null;

  let connectionUrl = 'postgresql://postgres:postgres@mydb:5432/seconddb';
  // {
  //   user: 'postgres',
  //   host: 'mydb',
  //   database: 'seconddb',
  //   password: 'postgres',
  //   port: 5432
  // }

  sequelize = new Sequelize(connectionUrl, {
    timestamps: false,
    underscored: true,
    logging:  true, //process.env.MYSQL_LOG === 'false' ? false:true,
    dialect: 'postgres',
    protocol: 'postgres',
    dialectOptions: {
      // ssl: true
    },
    operatorsAliases: true
  })

  let db = {
    Sequelize: Sequelize,
    sequelize: sequelize,
    // sequelizeLogs
  }

  let models = {
    Node: {},
  };

  // global.EventLog = sequelizeLogs.import(__dirname + '/logging');
  // // create new log
  // global.EventLog.create({
  //   club: 'testclub1',
  //   type: 'test1',
  //   data: {
  //     v: 1,
  //     xyz...
  //   }
  // })

  // Build models
  Object.keys(models).forEach(model=>{
    db[model] = sequelize.import(__dirname + '/' + pluralize(snake(model)));
  })

  global.db = db;

  // Associations/Relationships
  Object.keys(models).forEach(model=>{
    if(db[model].associate){
      // console.log('associate() on', model);
      db[model].associate();
    } else {
      // console.log('no associate() on', model);
    }
  })

}

module.exports = global.db