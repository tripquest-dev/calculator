import Hotel from "../models/hotels.model.js";

export const getHotelPrices = async (req, res) => {
  const { date, location } = req.query;
  const { groupSizeInfo } = req.body;

  console.log(groupSizeInfo);

  if (!date || !location) {
    return res.status(400).json({ error: "Date and location are required" });
  }

  // Validate date format (DD/MM/YY or DD/MM/YYYY)
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/;
  if (!dateRegex.test(date)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use DD/MM/YY or DD/MM/YYYY" });
  }

  let roomCapacity = 0;
  let singleRoom = 0,
    doubleRoom = 0,
    tripleRoom = 0;
  let adultsCount = 0;
  let kidsCount = 0;
  let singleKidAge = null;
  let kidDiscount = 0;
  let hasKidInRoom = false;

  adultsCount = groupSizeInfo?.adults?.count || 0;

  // Process kids
  groupSizeInfo?.kids?.age?.forEach((age) => {
    if (age >= 3 && age <= 12) {
      kidsCount++;
      if (kidsCount === 1) {
        singleKidAge = age;
      }
    } else if (age > 12) {
      adultsCount++; // Kids over 12 are treated as adults
    }
  });

  console.log(`Adults: ${adultsCount}, Kids (3-12): ${kidsCount}`);

  if (kidsCount === 1 && singleKidAge >= 3 && singleKidAge <= 12) {
    // Case 1: Odd number of adults + 1 kid (3-12) - add kid to group size
    if (adultsCount % 2 === 1) {
      const totalGroupSize = adultsCount + 1; // Add kid to group size
      console.log(
        `Case 1: Odd adults (${adultsCount}) + 1 kid, total group size: ${totalGroupSize}`
      );

      if (totalGroupSize === 2) {
        doubleRoom = 1;
      } else if (totalGroupSize === 3) {
        tripleRoom = 1;
      } else if (totalGroupSize > 3) {
        if (totalGroupSize % 2 === 0) {
          doubleRoom = totalGroupSize / 2;
        } else {
          doubleRoom = (totalGroupSize - 3) / 2;
          tripleRoom = 1;
        }
      }
      kidDiscount = 0; // Kid is counted as full person in this case
    }
    // Case 2: Even number of adults + 1 kid - calculate rooms for adults, kid pays 25%
    else if (adultsCount % 2 === 0) {
      console.log(`Case 2: Even adults (${adultsCount}) + 1 kid`);

      // Special case 3: 2 adults + 1 kid = double room with kid discount
      if (adultsCount === 2) {
        console.log(`Case 3: 2 adults + 1 kid - double room with kid discount`);
        doubleRoom = 1;
        hasKidInRoom = true;
        // Kid discount will be calculated later as 25% of double room rate
      } else {
        // More than 2 adults (even number)
        doubleRoom = adultsCount / 2;
        hasKidInRoom = true;
        // Kid goes with one of the double rooms and pays 25% extra
      }
    }
  } else {
    // Original logic for other cases (no single kid 3-12, or multiple kids)
    let groupSize = adultsCount;

    if (kidsCount > 1) {
      groupSize += kidsCount; // Multiple kids are added to group size
    }

    console.log(`Other cases: Group size ${groupSize}`);

    switch (groupSize) {
      case 1:
        singleRoom = 1;
        break;
      case 2:
        doubleRoom = 1;
        break;
      case 3:
        tripleRoom = 1;
        break;
      default:
        if (groupSize > 3) {
          if (groupSize % 2 === 0) {
            doubleRoom = groupSize / 2;
          } else {
            doubleRoom = (groupSize - 3) / 2;
            tripleRoom = 1;
          }
        }
        break;
    }
  }

  console.log(
    "Final room allocation - Single room:",
    singleRoom,
    "Double room:",
    doubleRoom,
    "Triple room:",
    tripleRoom,
    "Has kid in room:",
    hasKidInRoom
  );

  // Parse date
  const [day, month, year] = date.split("/").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  const targetDate = new Date(fullYear, month - 1, day);

  if (isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  try {
    const hotels = await Hotel.find({
      location,
      pricing: {
        $elemMatch: {
          startMonth: { $lte: month },
          startDay: { $lte: day },
          endMonth: { $gte: month },
          endDay: { $gte: day },
          year: fullYear,
          // Exclude zero-priced entries
          $or: [
            { "rates.single": { $gt: 0 } },
            { "rates.double": { $gt: 0 } },
            { "rates.triple": { $gt: 0 } },
          ],
        },
      },
    });

    // Create separate maps for each room type that has count > 0
    const roomTypeMaps = {};

    if (singleRoom > 0) {
      roomTypeMaps.single = new Map();
    }
    if (doubleRoom > 0) {
      roomTypeMaps.double = new Map();
    }
    if (tripleRoom > 0) {
      roomTypeMaps.triple = new Map();
    }

    hotels.forEach((hotel) => {
      const match = hotel.pricing.find((p) => {
        const start = new Date(p.year, p.startMonth - 1, p.startDay);
        const end = new Date(p.year, p.endMonth - 1, p.endDay);
        // Ensure non-zero rates for the match
        return (
          targetDate >= start &&
          targetDate <= end &&
          (p.rates.single > 0 || p.rates.double > 0 || p.rates.triple > 0)
        );
      });

      if (!match) return;

      // Process each room type that has count > 0
      Object.keys(roomTypeMaps).forEach((roomType) => {
        const rateKey =
          roomType === "single"
            ? "single"
            : roomType === "double"
            ? "double"
            : "triple";

        if (!match.rates[rateKey] || match.rates[rateKey] === 0) return; // Skip if rate is zero or doesn't exist

        const current = roomTypeMaps[roomType].get(hotel.class);

        // Calculate kid discount and final rate
        let baseRate = match.rates[rateKey];
        let calculatedKidDiscount = 0;
        let finalRate = baseRate;

        // Apply kid discount only for double rooms when hasKidInRoom is true
        if (hasKidInRoom && roomType === "double") {
          calculatedKidDiscount = baseRate * 0.25; // 25% of room rate for kid
          finalRate = baseRate + calculatedKidDiscount; // Base rate + 25% for kid
        }

        if (!current || finalRate < current.finalRate) {
          const roomCount =
            roomType === "single"
              ? singleRoom
              : roomType === "double"
              ? doubleRoom
              : tripleRoom;

          roomTypeMaps[roomType].set(hotel.class, {
            class: hotel.class,
            hotel: hotel.name,
            roomType: roomType,
            roomCount: roomCount,
            baseRate: baseRate, // Original room rate
            kidDiscount: calculatedKidDiscount, // Discount amount for kid
            finalRate: finalRate, // Rate including kid discount if applicable
            totalPrice: finalRate * roomCount, // Final price for all rooms of this type
            hasKidInRoom: hasKidInRoom && roomType === "double",
            adultsCount: adultsCount,
            kidsCount: kidsCount,
            description: match.description,
          });
        }
      });
    });

    // Combine results from all room type maps
    const result = [];
    Object.values(roomTypeMaps).forEach((map) => {
      result.push(...Array.from(map.values()));
    });

    if (result.length === 0) {
      return res
        .status(404)
        .json({ error: "No hotels found for the given criteria" });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching hotel prices:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getAllHotelsByLocation = async (req, res) => {
  const { date, location } = req.query;
  const { groupSizeInfo } = req.body;

  if (!date || !location) {
    return res.status(400).json({ error: "Date and location are required" });
  }

  // Validate date format (DD/MM/YY or DD/MM/YYYY)
  const dateRegex = /^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/;
  if (!dateRegex.test(date)) {
    return res
      .status(400)
      .json({ error: "Invalid date format. Use DD/MM/YY or DD/MM/YYYY" });
  }

  // Parse date
  const [day, month, year] = date.split("/").map(Number);
  const fullYear = year < 100 ? 2000 + year : year;
  const targetDate = new Date(fullYear, month - 1, day);

  if (isNaN(targetDate.getTime())) {
    return res.status(400).json({ error: "Invalid date" });
  }

  // Process group size
  let adultsCount = groupSizeInfo?.adults?.count || 0;
  let kidsCount = 0;
  let singleKidAge = null;
  let kidDiscount = 0;
  let hasKidInRoom = false;

  // Process kids
  groupSizeInfo?.kids?.age?.forEach((age) => {
    if (age >= 3 && age <= 12) {
      kidsCount++;
      if (kidsCount === 1) {
        singleKidAge = age;
      }
    } else if (age > 12) {
      adultsCount++; // Kids over 12 are treated as adults
    }
  });

  console.log(`Adults: ${adultsCount}, Kids (3-12): ${kidsCount}`);

  // Room allocation
  let singleRoom = 0,
    doubleRoom = 0,
    tripleRoom = 0;

  if (kidsCount === 1 && singleKidAge >= 3 && singleKidAge <= 12) {
    // Case 1: Odd number of adults + 1 kid (3-12) - add kid to group size
    if (adultsCount % 2 === 1) {
      const totalGroupSize = adultsCount + 1; // Add kid to group size
      console.log(
        `Case 1: Odd adults (${adultsCount}) + 1 kid, total group size: ${totalGroupSize}`
      );

      if (totalGroupSize === 2) {
        doubleRoom = 1;
      } else if (totalGroupSize === 3) {
        tripleRoom = 1;
      } else if (totalGroupSize > 3) {
        if (totalGroupSize % 2 === 0) {
          doubleRoom = totalGroupSize / 2;
        } else {
          doubleRoom = (totalGroupSize - 3) / 2;
          tripleRoom = 1;
        }
      }
      kidDiscount = 0; // Kid is counted as full person
    }
    // Case 2: Even number of adults + 1 kid - calculate rooms for adults, kid pays 25%
    else if (adultsCount % 2 === 0) {
      console.log(`Case 2: Even adults (${adultsCount}) + 1 kid`);

      // Special case 3: 2 adults + 1 kid = double room with kid discount
      if (adultsCount === 2) {
        console.log(`Case 3: 2 adults + 1 kid - double room with kid discount`);
        doubleRoom = 1;
        hasKidInRoom = true;
      } else {
        // More than 2 adults (even number)
        doubleRoom = adultsCount / 2;
        hasKidInRoom = true;
      }
    }
  } else {
    // Other cases (no single kid 3-12, or multiple kids)
    let groupSize = adultsCount;
    if (kidsCount > 1) {
      groupSize += kidsCount; // Multiple kids added to group size
    }

    console.log(`Other cases: Group size ${groupSize}`);

    switch (groupSize) {
      case 1:
        singleRoom = 1;
        break;
      case 2:
        doubleRoom = 1;
        break;
      case 3:
        tripleRoom = 1;
        break;
      default:
        if (groupSize > 3) {
          if (groupSize % 2 === 0) {
            doubleRoom = groupSize / 2;
          } else {
            doubleRoom = (groupSize - 3) / 2;
            tripleRoom = 1;
          }
        }
        break;
    }
  }

  console.log(
    "Final room allocation - Single room:",
    singleRoom,
    "Double room:",
    doubleRoom,
    "Triple room:",
    tripleRoom,
    "Has kid in room:",
    hasKidInRoom
  );

  try {
    const hotels = await Hotel.find({
      location,
      pricing: {
        $elemMatch: {
          startMonth: { $lte: month },
          startDay: { $lte: day },
          endMonth: { $gte: month },
          endDay: { $gte: day },
          year: fullYear,
        },
      },
    });

    if (hotels.length === 0) {
      return res
        .status(404)
        .json({ error: "No hotels found for the given location" });
    }

    const result = hotels.map((hotel) => {
      const pricing = hotel.pricing.find((p) => {
        const start = new Date(p.year, p.startMonth - 1, p.startDay);
        const end = new Date(p.year, p.endMonth - 1, p.endDay);
        return targetDate >= start && targetDate <= end;
      }) || { rates: { single: 0, double: 0, triple: 0 }, description: "" };

      // Calculate rates with kid discount if applicable
      const rates = {
        single: pricing.rates.single || 0,
        double: pricing.rates.double || 0,
        triple: pricing.rates.triple || 0,
      };

      // Apply kid discount for double rooms when hasKidInRoom is true
      let kidDiscountAmount = 0;
      if (hasKidInRoom && rates.double > 0) {
        kidDiscountAmount = rates.double * 0.25;
        rates.double += kidDiscountAmount; // Add 25% for kid
      }

      // Calculate total price based on room allocation
      const totalPrice =
        rates.single * singleRoom +
        rates.double * doubleRoom +
        rates.triple * tripleRoom;

      return {
        name: hotel.name,
        location: hotel.location,
        class: hotel.class, // Keep numeric class (1 to 6)
        rates: {
          single: rates.single,
          double: rates.double,
          triple: rates.triple,
        },
        kidDiscount: kidDiscountAmount * doubleRoom, // Total kid discount for all double rooms
        totalPrice: totalPrice,
        hasKidInRoom: hasKidInRoom && doubleRoom > 0,
        adultsCount,
        kidsCount,
        description: pricing.description || "Standard rate",
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching all hotels by location:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
// import Hotel from "../models/hotels.model.js";
// export const getHotelPrices = async (req, res) => {
//   const { date, location } = req.query;

//   const { groupSizeInfo } = req.body;

//   console.log(groupSizeInfo);

//   let roomCapacity = 0;
//   let singleRoom = 0,
//     doubleRoom = 0,
//     tripleRoom = 0;
//   let adultsCount = 0;
//   let kidsCount = 0;
//   let singleKidAge = null;
//   let kidDiscount = 0;
//   let hasKidInRoom = false;

//   adultsCount = groupSizeInfo?.adults?.count || 0;

//   // Process kids
//   groupSizeInfo?.kids?.age?.forEach((age) => {
//     if (age >= 3 && age <= 12) {
//       kidsCount++;
//       if (kidsCount === 1) {
//         singleKidAge = age;
//       }
//     } else if (age > 12) {
//       adultsCount++; // Kids over 12 are treated as adults
//     }
//   });

//   console.log(`Adults: ${adultsCount}, Kids (3-12): ${kidsCount}`);

//   if (kidsCount === 1 && singleKidAge >= 3 && singleKidAge <= 12) {
//     // Case 1: Odd number of adults + 1 kid (3-12) - add kid to group size
//     if (adultsCount % 2 === 1) {
//       const totalGroupSize = adultsCount + 1; // Add kid to group size
//       console.log(
//         `Case 1: Odd adults (${adultsCount}) + 1 kid, total group size: ${totalGroupSize}`
//       );

//       if (totalGroupSize === 2) {
//         doubleRoom = 1;
//       } else if (totalGroupSize === 3) {
//         tripleRoom = 1;
//       } else if (totalGroupSize > 3) {
//         if (totalGroupSize % 2 === 0) {
//           doubleRoom = totalGroupSize / 2;
//         } else {
//           doubleRoom = (totalGroupSize - 3) / 2;
//           tripleRoom = 1;
//         }
//       }
//       kidDiscount = 0; // Kid is counted as full person in this case
//     }
//     // Case 2: Even number of adults + 1 kid - calculate rooms for adults, kid pays 25%
//     else if (adultsCount % 2 === 0) {
//       console.log(`Case 2: Even adults (${adultsCount}) + 1 kid`);

//       // Special case 3: 2 adults + 1 kid = double room with kid discount
//       if (adultsCount === 2) {
//         console.log(`Case 3: 2 adults + 1 kid - double room with kid discount`);
//         doubleRoom = 1;
//         hasKidInRoom = true;
//         // Kid discount will be calculated later as 25% of double room rate
//       } else {
//         // More than 2 adults (even number)
//         doubleRoom = adultsCount / 2;
//         hasKidInRoom = true;
//         // Kid goes with one of the double rooms and pays 25% extra
//       }
//     }
//   } else {
//     // Original logic for other cases (no single kid 3-12, or multiple kids)
//     let groupSize = adultsCount;

//     if (kidsCount > 1) {
//       groupSize += kidsCount; // Multiple kids are added to group size
//     }

//     console.log(`Other cases: Group size ${groupSize}`);

//     switch (groupSize) {
//       case 1:
//         singleRoom = 1;
//         break;
//       case 2:
//         doubleRoom = 1;
//         break;
//       case 3:
//         tripleRoom = 1;
//         break;
//       default:
//         if (groupSize > 3) {
//           if (groupSize % 2 === 0) {
//             doubleRoom = groupSize / 2;
//           } else {
//             doubleRoom = (groupSize - 3) / 2;
//             tripleRoom = 1;
//           }
//         }
//         break;
//     }
//   }

//   console.log(
//     "Final room allocation - Single room:",
//     singleRoom,
//     "Double room:",
//     doubleRoom,
//     "Triple room:",
//     tripleRoom,
//     "Has kid in room:",
//     hasKidInRoom
//   );

//   if (!date || !location) {
//     return res.status(400).json({ error: "Date and location are required" });
//   }

//   const targetDate = new Date(date);

//   try {
//     const hotels = await Hotel.find({ location });

//     // Create separate maps for each room type that has count > 0
//     const roomTypeMaps = {};

//     if (singleRoom > 0) {
//       roomTypeMaps.single = new Map();
//     }
//     if (doubleRoom > 0) {
//       roomTypeMaps.double = new Map();
//     }
//     if (tripleRoom > 0) {
//       roomTypeMaps.triple = new Map();
//     }

//     hotels.forEach((hotel) => {
//       const match = hotel.pricing.find((p) => {
//         const start = new Date(2025, p.startMonth - 1, p.startDay);
//         const end = new Date(2025, p.endMonth - 1, p.endDay);
//         return targetDate >= start && targetDate <= end;
//       });

//       if (!match) return;

//       // Process each room type that has count > 0
//       Object.keys(roomTypeMaps).forEach((roomType) => {
//         const rateKey =
//           roomType === "single"
//             ? "single"
//             : roomType === "double"
//             ? "double"
//             : "triple";

//         if (!match.rates[rateKey]) return; // Skip if rate doesn't exist

//         const current = roomTypeMaps[roomType].get(hotel.class);

//         // Calculate kid discount and final rate
//         let baseRate = match.rates[rateKey];
//         let calculatedKidDiscount = 0;
//         let finalRate = baseRate;

//         // Apply kid discount only for double rooms when hasKidInRoom is true
//         if (hasKidInRoom && roomType === "double") {
//           calculatedKidDiscount = baseRate * 0.25; // 25% of room rate for kid
//           finalRate = baseRate + calculatedKidDiscount; // Base rate + 25% for kid
//         }

//         if (!current || finalRate < current.finalRate) {
//           const roomCount =
//             roomType === "single"
//               ? singleRoom
//               : roomType === "double"
//               ? doubleRoom
//               : tripleRoom;

//           roomTypeMaps[roomType].set(hotel.class, {
//             class: hotel.class,
//             hotel: hotel.name,
//             roomType: roomType,
//             roomCount: roomCount,
//             baseRate: baseRate, // Original room rate
//             kidDiscount: calculatedKidDiscount, // Discount amount for kid
//             finalRate: finalRate, // Rate including kid discount if applicable
//             totalPrice: finalRate * roomCount, // Final price for all rooms of this type
//             hasKidInRoom: hasKidInRoom && roomType === "double",
//             adultsCount: adultsCount,
//             kidsCount: kidsCount,
//             description: match.description,
//           });
//         }
//       });
//     });

//     // Combine results from all room type maps
//     const result = [];
//     Object.values(roomTypeMaps).forEach((map) => {
//       result.push(...Array.from(map.values()));
//     });

//     res.json(result);
//   } catch (error) {
//     console.error("Error fetching hotel prices:", error);
//     res.status(500).json({ error: "Internal server error" });
//   }
// };
