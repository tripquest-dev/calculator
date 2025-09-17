import express from "express";
import { getMiscPrice } from "../controllers/misc.controller.js";
const router = express.Router();

router.get("/misc-price", getMiscPrice);

export default router;
