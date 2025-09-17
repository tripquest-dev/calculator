import fs from "fs";
import mongoose from "mongoose";
import Hotel from "../models/hotels.model.js"; // Adjust path as needed
const CSV_FILE_PATH = "./src/data/hotelsnew.csv";
function parseDateString(dateRangeStr) {
  const ranges = dateRangeStr.split(",");
  const parsedRanges = [];

  ranges.forEach((range) => {
    const [start, end] = range.split("-");
    const [startDay, startMonth, startYear] = start.split("/").map(Number);
    const [endDay, endMonth, endYear] = end.split("/").map(Number);

    // Convert two-digit year to four-digit (assuming 20XX for years like 25, 26)
    const fullStartYear = startYear < 100 ? 2000 + startYear : startYear;
    const fullEndYear = endYear < 100 ? 2000 + endYear : endYear;

    // Validate year consistency within the range
    if (fullStartYear !== fullEndYear) {
      console.warn(`Inconsistent years in range "${range}", using start year`);
    }

    parsedRanges.push({
      startDay,
      startMonth,
      endDay,
      endMonth,
      year: fullStartYear,
    });
  });

  return parsedRanges;
}

export async function ingestHotels() {
  const hotelsData = {};

  try {
    const { default: csv } = await import("csv-parser");

    const stream = fs.createReadStream(CSV_FILE_PATH).pipe(
      csv({
        mapHeaders: ({ header }) =>
          header ? header.toLowerCase().replace(/\s/g, "") : null,
      })
    );

    stream
      .on("data", (row) => {
        const hotelName = row.hotelname;
        const classStr = row.class?.match(/\d+/);
        if (!classStr) {
          console.warn(`Skipping invalid class for hotel "${hotelName}"`);
          return;
        }
        const hotelClass = parseInt(classStr[0]);

        const location = row.location;
        const dateRangeStr = row.daterange;
        const description = row.description;
        const singleRate = parseFloat(row.singlerate);
        const doubleRate = parseFloat(row.doublerate);
        const tripleRate = parseFloat(row.triplerate);

        const parsedDateRanges = parseDateString(dateRangeStr);

        const uniqueKey = `${hotelName}::${hotelClass}`;

        if (!hotelsData[uniqueKey]) {
          hotelsData[uniqueKey] = {
            name: hotelName,
            class: hotelClass,
            location: location,
            pricing: [],
          };
        }

        parsedDateRanges.forEach((range) => {
          hotelsData[uniqueKey].pricing.push({
            startMonth: range.startMonth,
            startDay: range.startDay,
            endMonth: range.endMonth,
            endDay: range.endDay,
            year: range.year,
            description: description,
            rates: {
              single: singleRate,
              double: doubleRate,
              triple: tripleRate,
            },
          });
        });
      })
      .on("end", async () => {
        console.log("CSV file successfully processed");

        try {
          await Hotel.deleteMany({});
          console.log("Existing hotel data cleared.");

          for (const key in hotelsData) {
            const hotel = hotelsData[key];
            await Hotel.findOneAndUpdate(
              { name: hotel.name, class: hotel.class }, // match by both name and class
              {
                $set: {
                  location: hotel.location,
                },
                $push: { pricing: { $each: hotel.pricing } },
              },
              { upsert: true, new: true }
            );
            console.log(
              `Saved/Updated hotel: ${hotel.name} (Class ${hotel.class})`
            );
          }

          console.log("All hotels ingested successfully!");
        } catch (error) {
          console.error("Error ingesting data:", error);
        } finally {
          mongoose.disconnect();
        }
      })
      .on("error", (error) => {
        console.error("Error reading CSV:", error);
      });
  } catch (err) {
    console.error("Error importing csv-parser:", err);
  }
}

// import fs from "fs";
// import mongoose from "mongoose";
// import Hotel from "../models/hotels.model.js"; // Adjust path as needed
// import { parseDateString } from "../utils/parseDateString.js"; // Adjust path as needed
// const CSV_FILE_PATH = "./src/data/hotels.csv"; // Adjust path as needed
// export async function ingestHotels() {
//   const hotelsData = {};

//   try {
//     const { default: csv } = await import("csv-parser");

//     const stream = fs.createReadStream(CSV_FILE_PATH).pipe(
//       csv({
//         mapHeaders: ({ header }) =>
//           header ? header.toLowerCase().replace(/\s/g, "") : null,
//       })
//     );

//     stream
//       .on("data", (row) => {
//         const hotelName = row.hotelname;
//         const classStr = row.class?.match(/\d+/);
//         if (!classStr) {
//           console.warn(`Skipping invalid class for hotel "${hotelName}"`);
//           return;
//         }
//         const hotelClass = parseInt(classStr[0]);

//         const location = row.location;
//         const dateRangeStr = row.daterange;
//         const description = row.description;
//         const singleRate = parseFloat(row.singlerate);
//         const doubleRate = parseFloat(row.doublerate);
//         const tripleRate = parseFloat(row.triplerate);

//         const parsedDateRanges = parseDateString(dateRangeStr);

//         const uniqueKey = `${hotelName}::${hotelClass}`;

//         if (!hotelsData[uniqueKey]) {
//           hotelsData[uniqueKey] = {
//             name: hotelName,
//             class: hotelClass,
//             location: location,
//             pricing: [],
//           };
//         }

//         parsedDateRanges.forEach((range) => {
//           hotelsData[uniqueKey].pricing.push({
//             startMonth: range.startMonth,
//             startDay: range.startDay,
//             endMonth: range.endMonth,
//             endDay: range.endDay,
//             description: description,
//             rates: {
//               single: singleRate,
//               double: doubleRate,
//               triple: tripleRate,
//             },
//           });
//         });
//       })
//       .on("end", async () => {
//         console.log("CSV file successfully processed");

//         try {
//           await Hotel.deleteMany({});
//           console.log("Existing hotel data cleared.");

//           for (const key in hotelsData) {
//             const hotel = hotelsData[key];
//             await Hotel.findOneAndUpdate(
//               { name: hotel.name, class: hotel.class }, // match by both name and class
//               {
//                 $set: {
//                   location: hotel.location,
//                 },
//                 $push: { pricing: { $each: hotel.pricing } },
//               },
//               { upsert: true, new: true }
//             );
//             console.log(
//               `Saved/Updated hotel: ${hotel.name} (Class ${hotel.class})`
//             );
//           }

//           console.log("All hotels ingested successfully!");
//         } catch (error) {
//           console.error("Error ingesting data:", error);
//         } finally {
//           mongoose.disconnect();
//         }
//       })
//       .on("error", (error) => {
//         console.error("Error reading CSV:", error);
//       });
//   } catch (err) {
//     console.error("Error importing csv-parser:", err);
//   }
// }
