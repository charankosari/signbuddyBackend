const express = require("express");
const router = express.Router();
const {
  // login,
  // resetPassword,
  // sendOTP,
  // forgotPassword,
  // userDetails,
  // updateDetails,
  // register,
  // addTemplate,
  // deleteTemplate,
  // sendAgreement,
  // agreeDocument,
  // viewedDocument,
  // createAgreement,
  getEmails,
} = require("../controllers/userController");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });

const { isAuthorized, roleAuthorize } = require("../middleware/auth");

// router.route("/verifyemail").post(sendOTP);
// router.route("/register").post(register);
// router.route("/login").post(login);
// router.route("/forgotPassword").post(forgotPassword);
// router.route("/resetpassword/:id").post(resetPassword);
// router.route("/me").get(isAuthorized, userDetails);
// router.route("/addDetails").post(isAuthorized, updateDetails);
// router.route("/addtemplate").post(isAuthorized, addTemplate);
// router.route("/deletetemplate").post(isAuthorized, deleteTemplate);
// router.route("/sendagreement").post(isAuthorized, sendAgreement);
// router
//   .route("/agreedocument")
//   .post(isAuthorized, upload.single("file"), agreeDocument);

// router.route("/vieweddocument").post(isAuthorized, viewedDocument);
// router.route("/generatecontent").post(isAuthorized, createAgreement);
router.route("/getEmails").post(getEmails);
module.exports = router;
