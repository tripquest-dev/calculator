import fs from "fs";
import * as math from "mathjs";
import ServicePricing from "../models/servicePricing.js";
export const calculateFee = async (req, res) => {
  const { from, to, adults, kids } = req.query;

  if (!from || !to || !adults || !kids) {
    return res.status(400).json({
      error: "Missing required query parameters: from, to, adults, kids",
    });
  }

  const adultsNum = parseInt(adults);
  const kidsNum = parseInt(kids);
  if (isNaN(adultsNum) || isNaN(kidsNum) || adultsNum < 0 || kidsNum < 0) {
    return res
      .status(400)
      .json({ error: "adults and kids must be non-negative numbers" });
  }

  try {
    const formulas = JSON.parse(
      fs.readFileSync("./src/utils/feeFormulas.json", "utf-8")
    );
    //console.log(formulas);
    const rule = formulas.find((f) => f.from === from && f.to === to);
    if (!rule) {
      return res
        .status(404)
        .json({ error: `No fee formula found for from: ${from}, to: ${to}` });
    }

    //console.log(rule);
    const serviceCodes = rule.formula.match(/[A-Z0-9]+/g) || [];
    console.log(serviceCodes);
    const services = await ServicePricing.find({
      serviceCode: { $in: serviceCodes },
    }).lean();
    // console.log(services);
    const feeMap = services.reduce((map, service) => {
      map[service.serviceCode] = service.fee;
      return map;
    }, {});
    //console.log(feeMap);
    let formula = rule.formula;
    serviceCodes.forEach((code) => {
      formula = formula.replace(new RegExp(`\\b${code}\\b`, "g"), feeMap[code]);
    });

    // Add adults and kids to the formula
    formula = formula
      .replace(/\badults\b/g, adultsNum)
      .replace(/\bkids\b/g, kidsNum);

    console.log(formula);
    // Evaluate the formula using mathjs
    const result = math.evaluate(formula);
    const fee = parseFloat(result.toFixed(2)); // Round to 2 decimal places

    res.json({
      from,
      to,
      description: rule.description,
      fee,
    });
  } catch (error) {
    console.error("Error calculating fee:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};
//59+ 424.8
