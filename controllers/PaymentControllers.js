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

  const { planType, creditPackage, subscriptionPlan } = req.body;
  let amount = 0;
  let credits = 0;
  let subscriptionType = null;

  // First, get the Plans document (assuming there's only one)
  const plansDoc = await Plan.findOne({});
  if (!plansDoc) {
    return res.status(400).json({ error: "Plans not configured" });
  }

  // Then, for credits, find the matching credit package inside the array
  if (planType === "credits") {
    const selectedPackage = plansDoc.creditPackages.find(
      (pkg) => pkg.credits.toString() === creditPackage
    );
    if (!selectedPackage) {
      return res.status(400).json({ error: "Invalid credit package" });
    }
    amount = selectedPackage.price * 100; // Convert rupees to paise
    credits = selectedPackage.credits;
  } else if (planType === "subscription") {
    // Similar logic for subscription plans
    const selectedPlan = plansDoc.subscriptionPlans.find(
      (plan) => plan.planType === subscriptionPlan
    );
    if (!selectedPlan) {
      return res.status(400).json({ error: "Invalid subscription plan" });
    }
    subscriptionType = subscriptionPlan;
    amount =
      (subscriptionPlan === "yearly"
        ? selectedPlan.price * 12
        : selectedPlan.price) * 100;
  }

  // Create Razorpay order using the validated amount
  const order = await razorpayInstance.orders.create({
    amount: amount,
    currency: "INR",
    receipt: `receipt_order_${Date.now()}`,
    name: "SignBuddy",
    description: "payment for subscription or credits",
  });

  // Save payment details in the database
  const paymentRecord = await Payment.create({
    user: user._id,
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
    user: user.id,
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
