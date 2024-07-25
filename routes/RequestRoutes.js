import express from "express";
import {
  getPurchaseRequests,
  sendPurchaseRequest,
} from "../controllers/Request.Controller.js";
const router = express.Router();

router.route("/send").post(sendPurchaseRequest);
router.route("/:userId").get(getPurchaseRequests);

export default router;
