import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  class: {
    type: Number,
    required: true,
  },
  location: {
    type: String,
    required: true,
  },
  pricing: [
    {
      startMonth: Number,
      startDay: Number,
      endMonth: Number,
      endDay: Number,
      year: Number,
      description: String,
      rates: {
        single: Number,
        double: Number,
        triple: Number,
      },
    },
  ],
});

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
