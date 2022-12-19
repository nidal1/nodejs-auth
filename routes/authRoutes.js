const router = require("express").Router();
const authController = require("./../controllers/authControllers");

router.post("/signup", authController.signup);
router.get("/signin", authController.signin);
router.post("/forgotPassword", authController.forgotPassword);
router.patch("/resetPassword/:resetToken", authController.resetPassword);
router.patch(
  "/updatePassword",
  authController.protect,
  authController.updatePassword
);

router.patch("/signout", authController.protect, authController.signout);
module.exports = router;
