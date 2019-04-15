/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  let Node = sequelize.define('Node', {
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
      primaryKey: true,
      unique: true
    },
    // id: {
    //   type: DataTypes.INTEGER(11),
    //   allowNull: false,
    //   primaryKey: true,
    //   autoIncrement: true
    // },
    type: {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: ''
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    blobdata: {
      type: DataTypes.BLOB('long'),
      allowNull: true
    },
    // placeholder: {
    //   type: DataTypes.BOOLEAN,
    //   defaultValue: false,
    //   allowNull: false
    // }
  }, {
    tableName: process.env.DB_TABLE_NODES || 'nodes',
    timestamps: true
  });

  Node.associate = ()=>{

    // // where: name = name.split('.').pop()
    // Node.belongsTo(Node);

    // // where: name = name + '.[-/w]+$'
    // Node.hasMany(Node);

  }

  return Node;
};
