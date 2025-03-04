const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Razorpay = require("razorpay");
const Payment = require("../models/PaymentSchema");
const crypto = require("crypto");
const { config } = require("dotenv");
const User = require("../models/userModel");
const Plan = require("../models/PlansSchema"); // Added Plans schema

config({ path: "config/config.env" });
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

exports.PlaceOrder = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(400).json({ success: false, message: "User not found" });
  }

  const { userId, planType, creditPackage, subscriptionPlan } = req.body;
  let amount = 0;
  let credits = 0;
  let subscriptionType = null;

  // Validate pricing based on the PlansSchema
  if (planType === "credits") {
    // Fetch plan details from PlansSchema based on the provided credit package
    const plan = await Plan.findOne({
      planType: "credits",
      package: creditPackage,
    });
    if (!plan) {
      return res.status(400).json({ error: "Invalid credit package" });
    }
    // Use the price and credits stored in the database
    amount = plan.price * 100; // Convert rupees to paise
    credits = plan.credits;
  } else if (planType === "subscription") {
    // Fetch plan details for subscriptions
    const plan = await Plan.findOne({
      planType: "subscription",
      subscriptionPlan: subscriptionPlan,
    });
    if (!plan) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }
    subscriptionType = subscriptionPlan;
    // For yearly subscriptions, if the price is per month, multiply by 12 (adjust if your model differs)
    amount =
      (subscriptionPlan === "yearly" ? plan.price * 12 : plan.price) * 100;
  } else {
    return res.status(400).json({ error: "Invalid plan type" });
  }

  // Create Razorpay order using the validated amount
  const order = await razorpayInstance.orders.create({
    amount: amount,
    currency: "INR",
    receipt: `receipt_order_${Date.now()}`,
  });

  // Save payment details in the database
  const paymentRecord = await Payment.create({
    user: userId,
    paymentId: order.id,
    planType,
    subscriptionType,
    credits,
    amount: amount / 100, // Store amount in rupees
    status: "initiated",
  });

  res.json({ order, paymentRecord });
});

exports.VerifyPayment = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(400).json({ success: false, message: "User not found" });
  }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, userId } =
    req.body;

  // Generate expected signature
  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const expectedSignature = hmac.digest("hex");

  // Find the payment record
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
    // Payment verification failed
    paymentRecord.status = "failed";
    await paymentRecord.save();

    // Optionally initiate a refund
    const refund = await razorpayInstance.payments.refund(razorpay_payment_id, {
      amount: paymentRecord.amount * 100, // refund amount in paise
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

  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(req.rawBody);
  const digest = hmac.digest("hex");

  if (digest === signature) {
    const event = req.body.event;
    // Log and process the webhook event
    if (event === "payment.captured") {
      const paymentData = req.body.payload.payment.entity;
      await Payment.findOneAndUpdate(
        { paymentId: paymentData.order_id },
        { status: "success" }
      );
    }
    // Process other webhook events as needed.
    return res.status(200).json({ status: "ok" });
  } else {
    return res.status(400).json({ error: "Invalid signature" });
  }
});
