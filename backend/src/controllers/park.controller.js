import fs from "fs";
import * as math from "mathjs";
import ServicePricing from "../models/servicePricing.js";
export const calculateFee = async (req, res) => {
  const { from, to, adults, kids } = req.query;
  const adultsNum = parseInt(adults);
  const kidsNum = parseInt(kids);

  if (isNaN(adultsNum) || isNaN(kidsNum) || adultsNum < 0 || kidsNum < 0) {
    return res.status(400).json({ error: "Invalid adults or kids value" });
  }

  try {
    console.log("Starting request:", {
      from,
      to,
      adults: adultsNum,
      kids: kidsNum,
    });
    const formulas = JSON.parse(
      fs.readFileSync("./src/utils/feeFormulas.json", "utf-8")
    );
    console.log(
      "Formulas loaded, checking for route:",
      formulas.some((f) => f.from === from && f.to === to)
    );
    const rule = formulas.find((f) => f.from === from && f.to === to);
    if (!rule) {
      console.log("No rule found for:", { from, to });
      return res
        .status(404)
        .json({ error: `No fee formula found for from: ${from}, to: ${to}` });
    }
    console.log("Found rule:", rule);

    const serviceCodes = (rule.formula.match(/[A-Z][A-Z0-9]*/g) || []).filter(
      (code) => !/^\d+$/.test(code) && code !== "N"
    );
    console.log("Extracted service codes (excluding N):", serviceCodes);

    const services = await ServicePricing.find({
      serviceCode: { $in: serviceCodes },
    }).lean();
    console.log(
      "Fetched services count:",
      services.length,
      "services:",
      services
    );

    const feeMap = services.reduce((map, service) => {
      map[service.serviceCode] = service.fee;
      return map;
    }, {});
    console.log("Constructed fee map:", feeMap);

    // Calculate N based on group size
    const groupSize = adultsNum + kidsNum;
    let N;
    if (groupSize < 7) {
      N = 1;
    } else if (groupSize > 7) {
      if (groupSize % 7 === 0) {
        N = groupSize / 7;
      } else {
        N = Math.floor(groupSize / 7) + 1;
      }
    } else {
      N = 1; // groupSize === 7
    }
    console.log("Calculated N:", N, "for groupSize:", groupSize);

    let formula = rule.formula;
    // Replace service codes (excluding N)
    serviceCodes.forEach((code) => {
      const feeValue = feeMap[code] || 0;
      formula = formula.replace(new RegExp(`\\b${code}\\b`, "g"), feeValue);
      console.log(`Replaced ${code} with ${feeValue}`);
    });
    // Replace N
    formula = formula.replace(/\bN\b/g, N);
    console.log("After replacing N:", formula);
    // Replace adults and kids
    formula = formula
      .replace(/\badults\b/g, adultsNum)
      .replace(/\bkids\b/g, kidsNum);
    console.log("Final formula to evaluate:", formula);

    const result = math.evaluate(formula);
    console.log("Math evaluation result:", result);
    const fee = parseFloat(result.toFixed(2));
    console.log("Calculated fee:", fee);

    res.json({
      from,
      to,
      description: rule.description,
      fee,
    });
  } catch (error) {
    console.error("Backend error details:", {
      message: error.message,
      stack: error.stack,
      params: { from, to, adults: adultsNum, kids: kidsNum },
      formula: rule?.formula,
    });
    res.status(500).json({ error: "Internal server error" });
  }
};
//59+ 424.8
