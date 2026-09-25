"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Notification extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate({ Article, Comment, User }) {
      // define association here

      this.belongsTo(User, { as: "recipient", foreignKey: "recipientId" });
      this.belongsTo(User, { as: "actor", foreignKey: "actorId" });
      this.belongsTo(Article, { as: "article", foreignKey: "articleId" });
      this.belongsTo(Comment, { as: "comment", foreignKey: "commentId" });
    }

    toJSON() {
      return {
        ...this.get(),
        recipientId: undefined,
        actorId: undefined,
        articleId: undefined,
        commentId: undefined,
      };
    }
  }
  Notification.init(
    {
      type: DataTypes.STRING,
      read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "Notification",
    },
  );
  return Notification;
};
