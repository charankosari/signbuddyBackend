const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Razorpay = require("razorpay");
const Payment = require("../models/PaymentSchema");
const InvoiceModel = require("../models/InvoiceModel");
const crypto = require("crypto");
const { config } = require("dotenv");
const User = require("../models/userModel");
const Plan = require("../models/PlansSchema");
const { putObject, sendEmailWithAttachments } = require("../utils/s3objects");
config({ path: "config/config.env" });
const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const invoiceHtml = (
  customerNo,
  invoiceNoUnique,
  planType,
  amount,
  Date,
  email,
  username,
  description
) => {
  return `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Invoice Template</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  </head>
  <body
    style="
      margin: 0;
      padding: 10px;
      font-family: Arial, sans-serif;
      background-color: #f5f5f5;
    "
  >
    <div
      id="invoice"
      style="
        width: 190mm;
        margin: 20px auto;
        background: white;
        padding: 24px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      "
    >
      <!-- Header Section -->
      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
        "
      >
        <div style="display: flex; align-items: center">
          <div
            style="
              width: fit-content;
              height: 32px;
              padding: 12px;
              background-color: #09090b;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-weight: bold;
            "
          >
            SignBuddy
          </div>
        </div>
        <div style="text-align: right">
          <h1 style="margin: 0; color: #333; font-size: 24px">Syncore Labs</h1>
          <p style="font-size: 14px; margin: 5px 0">
            Registered as <strong>Lavin Visionnaire</strong>
          </p>
          <p style="margin: 5px 0; color: #666">Customer No:#${customerNo}</p>
          <p style="margin: 5px 0; color: #666">Invoice No: #${invoiceNoUnique}</p>
          <p style="margin: 5px 0; color: #666">Date: ${Date}</p>
        </div>
      </div>

      <!-- Address Section -->
      <div
        style="
          display: flex;
          justify-content: space-between;
          margin-bottom: 32px;
        "
      >
        <div>
          <h3 style="margin: 0 0 10px 0; color: #333">FROM</h3>
          <h4 style="margin: 5px 0 5px 0">SignBuddy</h4>
          <p style="margin: 0; color: #666">Pallavi Estates, Ameerpet</p>
          <p style="margin: 0; color: #666">HYD, Telanga, India.</p>
        </div>
        <div style="text-align: right">
          <h3 style="margin: 0 0 10px 0; color: #333">Invoice TO</h3>
          <h4 style="margin: 0 0 5px 0">${username}</h4>
          <p style="margin: 0; color: #666; font-size: 14px">
            ${email}
          </p>
        </div>
      </div>

      <!-- Invoice Table -->
      <table
        style="
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 14px;
        "
      >
        <thead>
          <tr style="background-color: #f8f9fa">
            <th
              style="
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
              "
            >
              Item/Plan
            </th>
            <th
              style="
                padding: 12px;
                text-align: left;
                border-bottom: 2px solid #dee2e6;
              "
            >
              Description
            </th>
            <th
              style="
                padding: 12px;
                text-align: right;
                border-bottom: 2px solid #dee2e6;
              "
            >
              Price
            </th>
            <th
              style="
                padding: 12px;
                text-align: right;
                border-bottom: 2px solid #dee2e6;
              "
            >
              Total INR
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6">
              ${planType}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6">
             ${description}
            </td>
            <td
              style="
                padding: 12px;
                border-bottom: 1px solid #dee2e6;
                text-align: right;
              "
            >
            ₹${amount}
            </td>
            <td
              style="
                padding: 12px;
                border-bottom: 1px solid #dee2e6;
                text-align: right;
              "
            >
           ₹${amount}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- Total Section -->
      <div style="margin-left: auto; width: 250px">
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          "
        >
          <span>Sub Total</span>
          <span> ₹${amount}</span>
        </div>
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
          "
        >
          <span>Tax</span>
          <span>N/A</span>
        </div>
        <div
          style="
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            padding-top: 10px;
            border-top: 2px solid #dee2e6;
          "
        >
          <strong>Total</strong>
          <strong> ₹${amount} INR</strong>
        </div>
      </div>

      <!-- External Note -->
      <div style="margin: 60px 0 20px 0">
        <h4 style="color: #333; margin-bottom: 6px; font-size: 14px">
          External Note
        </h4>
        <p style="color: #666; margin: 0; font-size: 12px">
          This is a digitally generated Invoice, and doesn't require a
          signature.
        </p>
      </div>
    </div>
   
  </body>
</html>

  `;
};
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
    notes: {
      merchant_name: "SignBuddy",
      purpose: "payment for subscription or credits",
    },
  });

  // Save payment details in the database
  const paymentRecord = await Payment.create({
    user: req.user.id,
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
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
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
      user.creditsHistory.push({
        thingUsed: "purchase",
        creditsUsed: paymentRecord.credits,
      });
    } else if (paymentRecord.planType === "subscription") {
      user.subscription.type = paymentRecord.subscriptionType;
      user.subscription.timeStamp = new Date();
      user.setSubscriptionEndDate();
    }
    await user.save();
    try {
      // Generate a unique random invoice number.
      let randomInvoiceNo =
        "INV" + crypto.randomBytes(4).toString("hex").toUpperCase();
      let invoiceNoUnique = randomInvoiceNo;
      while (await InvoiceModel.findOne({ invoiceNo: invoiceNoUnique })) {
        invoiceNoUnique =
          "INV" + crypto.randomBytes(4).toString("hex").toUpperCase();
      }
      // Generate customerNo based on total count of invoices (e.g., "00001", "00002", …)
      const invoiceCount = await InvoiceModel.countDocuments();
      const customerNo = String(invoiceCount + 1).padStart(5, "0");
      const Date = new Date().toLocaleDateString();
      let planTypeLabel;
      let planDescription;

      if (
        paymentRecord.planType === "yearly" ||
        paymentRecord.planType === "monthly"
      ) {
        planTypeLabel = `For Organizations/Teams ${paymentRecord.planType}`;
        planDescription = "Everything Unlimited, with infinite Credits";
      } else if (paymentRecord.planType === "credits") {
        if (paymentRecord.credits === 50) {
          planTypeLabel = "Basic Credits Plan";
          planDescription = "Basic - 50 credits";
        } else if (paymentRecord.credits === 100) {
          planTypeLabel = "Standard Credits Plan";
          planDescription = "Standard - 100 credits";
        } else if (paymentRecord.credits === 300) {
          planTypeLabel = "Premium Credits Plan";
          planDescription = "Premium - 300 credits";
        } else {
          planTypeLabel = "Credits Plan";
          planDescription = `${paymentRecord.credits} credits`;
        }
      }
      const InvoiceHtml = invoiceHtml(
        customerNo,
        invoiceNoUnique,
        planTypeLabel,
        paymentRecord.amount,
        Date,
        email,
        username,
        planDescription
      );

      const pdfBuffer = await generatePdfBuffer(InvoiceHtml);
      const pdfKey = `invoices/invoice_${invoiceNoUnique}.pdf`;

      const pdfUploadUrl = await putObject(
        pdfBuffer,
        pdfKey,
        "application/pdf"
      );

      // 4. Save invoice details in InvoiceModel.
      const newInvoice = new InvoiceModel({
        invoiceUrl: pdfUploadUrl.url,
        invoiceNo: invoiceNoUnique,
        customerNo: customerNo,
        user: user._id,
      });
      await newInvoice.save();

      // 5. Send the invoice as an email attachment using SES.
      await sendEmailWithAttachments(
        user.email,
        "Your Invoice",
        "Please find attached your invoice.",
        pdfBuffer,
        pdfKey
      );

      return res.json({
        success: true,
        message: "Payment verified, invoice generated and sent successfully.",
        invoiceUrl: pdfUploadUrl,
      });
    } catch (invoiceError) {
      console.error("Error generating invoice PDF:", invoiceError);
      return res.status(500).json({
        error: "Payment verified but failed to generate invoice PDF.",
      });
    }
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
