import express from "express";
import {
  authenticateUser,
  getValidUser,
  userLogin,
  userLogout,
  userSignUp,
} from "../controllers/Auth.Controllers.js";
import AppError from "../utils/appError.js";
import {
  addMembership,
  deleteUploads,
  getModerationProductsforAdmin,
  getMyProducts,
  deleteMyProduct,
  postProduct,
  updateModerationProductStatus,
  uploads,
  getModerationProductsforAdminByID,
  updateProduct,
} from "../controllers/User.Controllers.js";
import { getPlans } from "../controllers/Membership.Controller.js";
import { createDonation } from "../controllers/Donation.Controller.js";
import upload from "../utils/upload.js";

const router = express.Router();

router.route("/login").post(userLogin);
router.route("/getValidUser").get(getValidUser);
router.route("/authenticate").get(authenticateUser, (req, res, next) => {
  try {
    res.status(200).json({ message: "Access granted to protected route" });
    console.log("Authenticated");
  } catch (err) {
    return next(new AppError("unauthorized", 401));
  }
});
router.route("/signup").post(userSignUp);
router.route("/logout").post(userLogout);

// for membership
router.route("/membership").post(authenticateUser, addMembership);
router.route("/plans").get(getPlans);

// for donation
router.route("/donation/create").post(createDonation);

//user routes

router.route("/addproduct").post(authenticateUser, postProduct).put(authenticateUser,updateProduct)
router.route("/uploads").post(upload.single("file"), uploads);
router.route("/uploads/:file").delete(authenticateUser, deleteUploads);

// for products
router
  .route("/moderation")
  .get(authenticateUser, getModerationProductsforAdmin)
  .put(authenticateUser, updateModerationProductStatus);
router
  .route("/moderation/:id")
  .get(authenticateUser, getModerationProductsforAdminByID);

router.route("/moderation/:id").getModera;
router.route("/my-products").get(authenticateUser, getMyProducts);
router.route("/my-products/:id").delete(authenticateUser, deleteMyProduct);
// .put(authenticateUser, updateModerationProductStatus);

export default router;
