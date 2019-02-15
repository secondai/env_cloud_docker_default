/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  let Node = sequelize.define('Node', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    type: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: ''
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'nodes',
    timestamps: true
  });

  return Node;
};
