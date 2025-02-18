const express = require("express");
const router = express.Router();
const {
  //   register,
  login,
  resetPassword,
  userDetails,
} = require("../controllers/userController");
const { isAuthorized, roleAuthorize } = require("../middleware/auth");

// router.route("/register").post(register);
router.route("/login").post(login);
router.route("/resetpassword/:id").post(resetPassword);
router.route("/me").get(isAuthorized, userDetails);

module.exports = router;
