const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Razorpay = require("razorpay");
const Payment = require("../models/PaymentSchema");
const crypto = require("crypto");
const { config } = require("dotenv");
const User = require("../models/userModel");

config({ path: "config/config.env" });
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
exports.PlaceOrder = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(400).json({ success: false, message: "user not founds" });
  }
  console.log(user);
  const { userId, planType, creditPackage, subscriptionPlan } = req.body;
  let amount = 0;
  let credits = 0;
  let subscriptionType = null;

  // Determine amount and details based on plan type
  if (planType === "credits") {
    if (creditPackage === "50") {
      amount = 199 * 100; // Amount in paise
      credits = 50;
    } else if (creditPackage === "100") {
      amount = 349 * 100;
      credits = 100;
    } else if (creditPackage === "300") {
      amount = 999 * 100;
      credits = 300;
    } else {
      return res.status(400).json({ error: "Invalid credit package" });
    }
  } else if (planType === "subscription") {
    subscriptionType = subscriptionPlan;
    if (subscriptionPlan === "monthly") {
      amount = 699 * 100;
    } else if (subscriptionPlan === "yearly") {
      amount = 599 * 12 * 100;
    } else {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }
  } else {
    return res.status(400).json({ error: "Invalid plan type" });
  }

  const order = await razorpayInstance.orders.create({
    amount: amount,
    currency: "INR",
    receipt: `receipt_order_${Date.now()}`,
  });
  const a = amount / 100;
  const paymentRecord = await Payment.create({
    user: userId,
    paymentId: order.id,
    planType,
    subscriptionType,
    credits,
    amount: a,
    status: "initiated",
  });

  res.json({ order, paymentRecord });
});

exports.VerifyPayment = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    res.status(400).json({ success: false, message: "user not founds" });
  }
  console.log(user);
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } =
    req.body;

  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const expectedSignature = hmac.digest("hex");
  const paymentRecord = await Payment.findOne({
    paymentId: razorpay_order_id,
    user: userId,
  });
  if (!paymentRecord) {
    return res.status(400).json({ error: "Payment record not found" });
  }

  if (expectedSignature === razorpay_signature) {
    paymentRecord.status = "success";
    await paymentRecord.save();
    if (paymentRecord.planType === "credits") {
      user.credits += paymentRecord.credits;
    } else if (paymentRecord.planType === "subscription") {
      user.subscriptionType = paymentRecord.subscriptionType;
    }
    await user.save();
    return res.json({
      success: true,
      message: "Payment verified and processed successfully.",
    });
  } else {
    // Verification failed; mark record and optionally trigger a refund
    paymentRecord.status = "failed";
    await paymentRecord.save();

    // Optionally initiate refund via Razorpay API
    const refund = await razorpayInstance.payments.refund(razorpay_payment_id, {
      amount: paymentRecord.amount,
    });
    paymentRecord.status = "refunded";
    await paymentRecord.save();

    return res.status(400).json({
      error: "Payment verification failed. Refund initiated.",
      refund,
    });
  }
});

exports.WebHook = asyncHandler(async (req, res, next) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  console.log(secret, signature);

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.rawBody);
  const digest = hmac.digest("hex");
  console.log(digest);

  if (digest === signature) {
    const event = req.body.event;
    console.log("Webhook event received:", event);

    // For a successful payment capture, update the payment record.
    if (event === "payment.captured") {
      const paymentData = req.body.payload.payment.entity;
      await Payment.findOneAndUpdate(
        { paymentId: paymentData.order_id },
        { status: "success" }
      );
    }

    // Handle other events (refunds, disputes, etc.) as needed.
    return res.status(200).json({ status: "ok" });
  } else {
    return res.status(400).json({ error: "Invalid signature" });
  }
});
