const LUNCH_BASE_PRICE = 10; //increases to 25 at row 2054, 20 at 3049
const WATER_BASE_PRICE = 1;
const SERVICE_FEE = 70;
export const getMiscPrice = (req, res) => {
  const { adultCount, kidCount, duration } = req.body; // frontend must specify kid age to be greater than 3
  try {
    const lunchBoxCost = LUNCH_BASE_PRICE * (adultCount + kidCount + 1); //food given just once in  a day
    const waterCost = WATER_BASE_PRICE * (adultCount + kidCount + 1) * duration;
    const serviceFee = (adultCount + kidCount) * SERVICE_FEE;
    const miscPrice = lunchBoxCost + waterCost + serviceFee;
    res.status(200).json({ miscPrice: miscPrice });
  } catch (error) {
    console.log("Error in misc controller", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
};
