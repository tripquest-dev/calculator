import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import { parseDateString } from "./utils/parseDateString.js";
import { ingestHotels } from "./utils/injestData.js";
import hotelRoutes from "./routes/hotels.route.js";
import parkRoutes from "./routes/park.route.js";
import miscRoutes from "./routes/misc.route.js";
import { importCsvToDatabase } from "./utils/servicePricing.js";
import cors from "cors";
dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT;

// const range = parseDateString("1 Nov - 15 Dec");
// console.log(range);
//ingestHotels();
//importCsvToDatabase("./src/data/servicePricing.csv");
app.use("/api/hotels", hotelRoutes);
app.use("/api/park", parkRoutes);
app.use("/api/misc", miscRoutes);
app.listen(PORT, () => {
  console.log("Server listening on PORT: " + PORT);
  connectDB();
});
