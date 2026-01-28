import mongoose from "mongoose";

const hotelSchema = new mongoose.Schema({
  location: {
    type: String,
    required: true,
    index:true
  },
   category: {
    type: String,
    enum: ["Value", "Comfort", "Premium", "Luxury"],
    required: true,
    index: true,
  },
  startDate:{
    type:Date,
    required:true,
    index:true
  },
   endDate: {
    type: Date,
    required: true,
    index: true,
  },
  hotel:{
      name: {
        type: String,
        required: true,
      },
      rates: {
        single: Number,
        double: Number,
        triple: Number,
      },
    
  },
});
hotelSchema.index({ location: 1, startDate: 1, endDate: 1, category: 1 });
const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
