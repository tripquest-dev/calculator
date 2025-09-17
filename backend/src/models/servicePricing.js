import mongoose from "mongoose";

const servicePricingSchema = new mongoose.Schema(
  {
    serviceCode: {
      type: String,
      required: true,
      unique: true,
    },
    serviceDescription: {
      type: String,
      required: true,
    },
    fee: {
      type: Number,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const ServicePricing = mongoose.model("ServicePricing", servicePricingSchema);
export default ServicePricing;
