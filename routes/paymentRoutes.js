const express = require("express");
const router = express.Router();
const {
  PlaceOrder,
  VerifyPayment,
  WebHook,
} = require("../controllers/PaymentControllers");
const { isAuthorized, roleAuthorize } = require("../middleware/auth");
router.route("/payment-status").post(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
  WebHook
);
router.route("/place-order").post(isAuthorized, PlaceOrder);
router.route("/verify-payment").post(isAuthorized, VerifyPayment);

module.exports = router;
