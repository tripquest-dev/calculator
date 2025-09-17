import mongoose from "mongoose";
import Papa from "papaparse";
import fs from "fs";
import ServicePricing from "../models/servicePricing.js";
export async function importCsvToDatabase(csvFilePath) {
  try {
    await ServicePricing.deleteMany({});
    // Read CSV file
    const csvData = fs.readFileSync(csvFilePath, "utf8");

    // Parse CSV using PapaParse
    Papa.parse(csvData, {
      header: true, // Use first row as headers
      skipEmptyLines: true,
      complete: async (result) => {
        try {
          const services = result.data.map((row) => ({
            serviceCode: row["Service Code"],
            serviceDescription: row["Service Description"],
            fee: parseFloat(row["Fee"]), // Convert fee to number
          }));
          //console.log("Success here papa parse");
          // Insert all services into the database
          await ServicePricing.insertMany(services, { ordered: false });
          console.log("Successfully imported CSV data to database");
        } catch (error) {
          console.error("Error inserting data:", error);
        }
      },
      error: (error) => {
        console.error("Error parsing CSV:", error);
      },
    });
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  }
}
