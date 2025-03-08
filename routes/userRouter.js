const express = require("express");
const router = express.Router();
const {
  login,
  resetPassword,
  sendOTP,
  forgotPassword,
  userDetails,
  updateDetails,
  register,
  addTemplate,
  deleteTemplate,
  sendAgreements,
  updateProfileDetails,
  agreeDocument,
  viewedDocument,
  createAgreement,
  getEmails,
  recentDocuments,
  addDraft,
  sendReminder,
  deleteDocument,
  getCredits,
  ConvertToImages,
  googleAuth,
  verifyEmailUpdate,
  deleteUser,
  changePassword,
  updateDraft,
  // createOrUpdatePlans,
  getPlans,
  getIp,
  getCounter,
} = require("../controllers/userController");
const multer = require("multer");
const storage = multer.memoryStorage();
const upload = multer({ storage });
const { getAvatars } = require("../utils/s3objects");
const { isAuthorized, roleAuthorize } = require("../middleware/auth");
router.route("/verifyemail").post(sendOTP);
router.route("/register").post(register);
router.route("/googleauth").post(googleAuth);
router.route("/login").post(login);
router.route("/forgotPassword").post(forgotPassword);
router.route("/resetpassword").post(resetPassword);
router.route("/me").get(isAuthorized, userDetails);
router.route("/me/profile-update").post(isAuthorized, updateProfileDetails);
router.route("/me/changepassword").post(isAuthorized, changePassword);
router.route("/me/profile-verify").post(isAuthorized, verifyEmailUpdate);
router.route("/me/recentdocuments").get(isAuthorized, recentDocuments);
router.route("/addDetails").post(isAuthorized, updateDetails);
router.route("/addtemplate").post(isAuthorized, addTemplate);
router.route("/adddrafts").post(isAuthorized, addDraft);
router.route("/deletetemplate").post(isAuthorized, deleteTemplate);
router.route("/sendagreement").post(isAuthorized, sendAgreements);

router.route("/sendreminder").post(isAuthorized, sendReminder);
router.route("/deleteagreement").delete(isAuthorized, deleteDocument);
router
  .route("/agreedocument")
  .post(isAuthorized, upload.single("file"), agreeDocument);
router.route("/vieweddocument").post(isAuthorized, viewedDocument);
router.route("/drafts/update").post(isAuthorized, updateDraft);
router.route("/generatecontent").post(isAuthorized, createAgreement);
router.route("/getEmails").post(getEmails);
router.route("/getavatars").get(getAvatars);
router.route("/me/profile-delete").delete(isAuthorized, deleteUser);
router.route("/getcredits").get(isAuthorized, getCredits);
router
  .route("/converttoimages")
  .post(isAuthorized, upload.single("file"), ConvertToImages);
router.route("/getplans").get(getPlans);
// router.route("/updateplans").post(createOrUpdatePlans);
router.route("/getip").get(getIp);
router.route("/getcount").get(getCounter);
module.exports = router;
