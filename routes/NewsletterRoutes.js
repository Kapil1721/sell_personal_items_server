import express from "express";
import { newsletter_email_verification, newsletter_unsubscribe, subscribeNewsLetter } from "../controllers/Newsletter.Controllers.js";
const router = express.Router();

router.route("/subscribe-newsletter").post(subscribeNewsLetter);
router.route("/confirmation/:id/:email").get(newsletter_email_verification);
router.route("/unsubscribe/:id/:email").get(newsletter_unsubscribe);

export default router;
