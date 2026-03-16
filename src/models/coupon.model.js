import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Coupon = sequelize.define(
  "coupons",
  {
    coupon_id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    coupon_code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },

    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    service_type: {
      type: DataTypes.ENUM("COOK", "MAID", "NANNY"),
      allowNull: false,
    },

    discount_type: {
      type: DataTypes.ENUM("PERCENTAGE", "FLAT"),
      allowNull: false,
    },

    discount_value: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },

    minimum_order_value: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },

    usage_limit: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    usage_per_user: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    start_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    end_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },

    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },

    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    freezeTableName: true,
    timestamps: false,
  }
);