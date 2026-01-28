import fs from "fs";
import csv from "csv-parser";
import mongoose from "mongoose";
import Hotel from "../models/hotels.model.js";

const CSV_FILE_PATH = "./src/data/dummy.csv";

function parseDateRange(range) {
  const [start, end] = range.split("-");

  const [sd, sm, sy] = start.split("/").map(Number);
  const [ed, em, ey] = end.split("/").map(Number);

  const startYear = sy < 100 ? 2000 + sy : sy;
  const endYear = ey < 100 ? 2000 + ey : ey;

  return {
    startDate: new Date(startYear, sm - 1, sd),
    endDate: new Date(endYear, em - 1, ed),
  };
}

export async function ingestHotels() {
  try {
    await Hotel.deleteMany({});
    console.log("Cleared existing hotel pricing data");

    let currentPlace = null;
    let currentMonth = null;

    const insertPromises = []; // 🔑 THIS IS THE KEY

    fs.createReadStream(CSV_FILE_PATH)
      .pipe(
        csv({
          mapHeaders: ({ header }) =>
            header ? header.trim().toLowerCase() : null,
        })
      )
      .on("data", (row) => {
        // ❗ DO NOT make this handler async
        const promise = (async () => {
          try {
            // Carry forward Excel-style grouping
            if (row.place) currentPlace = row.place.trim();
            if (row.month) currentMonth = row.month.trim();

            const location = currentPlace;
            const dateRange = currentMonth;
            const category = row.categories?.trim();
            const hotelName = row.hotels?.trim();

            if (!location || !dateRange || !category || !hotelName) {
              console.log("SKIPPED ROW:", row);
              return;
            }

            const { startDate, endDate } = parseDateRange(dateRange);

            await Hotel.create({
              location,
              category,
              startDate,
              endDate,
              hotel: {
                name: hotelName,
                rates: {
                  single: Number(row.single) || null,
                  double: Number(row.double) || null,
                  triple: Number(row.triple) || null,
                },
              },
            });

            console.log("INSERTED:", location, category, hotelName);
          } catch (err) {
            console.error("Failed to ingest row:", err.message);
          }
        })();

        insertPromises.push(promise); //  collect promise
      })
      .on("end", async () => {
        try {
          // 🔑 WAIT for all DB inserts
          await Promise.all(insertPromises);

          console.log("CSV ingestion completed successfully");
        } catch (err) {
          console.error("Error during ingestion:", err.message);
        } finally {
          await mongoose.disconnect();
        }
      });
  } catch (err) {
    console.error("Ingestion failed:", err.message);
  }
}
