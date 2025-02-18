const express = require("express");
const router = express.Router();
const {
  login,
  resetPassword,
  sendOTP,
  userDetails,
  register,
} = require("../controllers/userController");
const { isAuthorized, roleAuthorize } = require("../middleware/auth");

router.route("/verifyemail").post(sendOTP);
router.route("/register").post(register);
router.route("/login").post(login);
router.route("/resetpassword/:id").post(resetPassword);
router.route("/me").get(isAuthorized, userDetails);

module.exports = router;
