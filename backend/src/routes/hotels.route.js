import express from "express";
import { getHotelPrices } from "../controllers/hotel.controller.js";
import { getAllHotelsByLocation } from "../controllers/hotel.controller.js";

const router = express.Router();

router.post("/hotel-price", getHotelPrices);
router.post("/all", getAllHotelsByLocation);
export default router;
