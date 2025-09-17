import express from "express";
import { calculateFee } from "../controllers/park.controller.js";
const router = express.Router();

router.get("/calculate-fee", calculateFee);

export default router;
