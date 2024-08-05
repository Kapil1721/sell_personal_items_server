import express from "express";
import {
  AdminLogin,
  // authenticate,
  authMiddleware,
  changePassword,
  getValidUser,
  sendOtp,
  // Login,
  // RefreshToken,
  userLogin,
  userLogout,
  userSignUp,
  verifyOtp,
  verifyUser,
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
  getMyProduct,
  getProfile,
  updateAccountDetails,
  updateProfileImage,
  updateSocialMedia,
  upadatePassword,
  upadateEmail,
  deleteUser,
  deleteModerateProducts,
} from "../controllers/User.Controllers.js";
import {
  getPlans,
  getPlansById,
} from "../controllers/Membership.Controller.js";
import { createDonation } from "../controllers/Donation.Controller.js";
import upload from "../utils/upload.js";
import { PrismaClient } from "@prisma/client";
import {
  AddToFavorite,
  getAllProducts,
  getFavoriteProducts,
  getProductCategories,
  getSingleProduct,
  postLike,
  promoteProduct,
  RemoveFromFavorite,
} from "../controllers/Products.Controllers.js";
const prisma = new PrismaClient();

const router = express.Router();

router.route("/authenticate").get(authMiddleware, async (req, res, next) => {
  try {
    const user = await prisma.users.findUnique({
      where: {
        id: req.user.id,
      },
    });

    res
      .status(200)
      .json({ user, message: "Access granted to protected route" });
    console.log("Authenticated");
  } catch (err) {
    return next(new AppError("unauthorized", 401));
  }
});
router.route("/signup").post(userSignUp);
router.route("/logout").post(userLogout);
router.route("/login").post(userLogin);
router.route("/admin/login").post(AdminLogin);
router.route("/send-otp").post(sendOtp);
router.route("/change-password").post(changePassword);
router.route("/validate-otp").post(verifyOtp);
router.route("/u-verify").get(verifyUser);
router.route("/check-session").get(authMiddleware, async (req, res, next) => {
  try {
    // const _user = req.user.delete("iat")
    // console.log(req.user,_user);
    const user = await prisma.users.findUnique({
      where: {
        id: parseInt(req.user.id),
      },
    });
    if (!user) {
      throw new AppError("User not found", 404);
    }
    res.status(200).json({
      status: true,
      user: req.user,
    });
  } catch (error) {
    res.status(401).json({ status: "expired", message: "Session is expired" });
  }
});

//
// router.route("/login").post(Login);
// router.route("/refresh-token").post(RefreshToken);
// router.route("/protected").get(authenticate, (req, res) => {
//   res.json({ message: "Hello from protected route" });
// });

router.route("/getValidUser").get(authMiddleware, getValidUser);
router.route("/profile").get(authMiddleware, getProfile);
router.route("/profile").put(authMiddleware, updateAccountDetails);
router.route("/profile").delete(authMiddleware, deleteUser);
router.route("/profile/image").put(authMiddleware, updateProfileImage);
router.route("/profile/socialmedia").put(authMiddleware, updateSocialMedia);
router.route("/profile/password").put(authMiddleware, upadatePassword);
router.route("/profile/email").put(authMiddleware, upadateEmail);

// for membership
router.route("/membership").post(authMiddleware, addMembership);
router.route("/plans").get(getPlans);
router.route("/plans/:id").get(getPlansById);

// for donation
router.route("/donation/create").post(authMiddleware, createDonation);

//user routes

router
  .route("/addproduct")
  .post(authMiddleware, postProduct)
  .put(authMiddleware, updateProduct);
router.route("/uploads").post(upload.single("file"), uploads);
router.route("/uploads/:file").get(upload.single("file"), uploads);
router.route("/uploads/:file").delete(authMiddleware, deleteUploads);

// for products
router
  .route("/moderation")
  .get(authMiddleware, getModerationProductsforAdmin)
  .put(authMiddleware, updateModerationProductStatus);
router
  .route("/moderation/:id")
  .get(authMiddleware, getModerationProductsforAdminByID)
  .delete(authMiddleware, deleteModerateProducts);

router.route("/my-products").get(authMiddleware, getMyProducts);
router
  .route("/my-products/:id")
  .get(authMiddleware, getMyProduct)
  .delete(authMiddleware, deleteMyProduct);
// .put(authMiddleware, updateModerationProductStatus);

// for products

router.route("/products/:userId?").get(getAllProducts);
router.route("/like").post(authMiddleware, postLike);
router.route("/promote").post(authMiddleware, promoteProduct);
router.route("/promote").get(authMiddleware, promoteProduct);
router
  .route("/favorite")
  .get(authMiddleware, getFavoriteProducts)
  .post(authMiddleware, AddToFavorite)
  .delete(authMiddleware, RemoveFromFavorite);
router.route("/product/:slug").get(getSingleProduct);
router.route("/product-categories").get(getProductCategories);

export default router;
