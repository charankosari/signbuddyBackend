const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const Razorpay = require("razorpay");
const Payment = require("../models/PaymentSchema");
const InvoiceModel = require("../models/InvoiceModel");
const crypto = require("crypto");
const { config } = require("dotenv");
const User = require("../models/userModel");
const pdf = require("html-pdf");

const Plan = require("../models/PlansSchema");
const { putObject } = require("../utils/s3objects");
const { sendEmailWithAttachments } = require("../utils/sendEmail");
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
  formattedDate,
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
          <p style="margin: 5px 0; color: #666">Date: ${formattedDate}</p>
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
function generatePdfBuffer(htmlContent) {
  return new Promise((resolve, reject) => {
    const options = {
      width: "190mm",
      height: "600mm",
      childProcessOptions: {
        env: {
          OPENSSL_CONF: "/dev/null",
        },
      },
    };
    pdf.create(htmlContent, options).toBuffer((err, buffer) => {
      if (err) return reject(err);
      resolve(buffer);
    });
  });
}
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

  res.json({
    success: true,
    message: "Order placed successfully",
    order,
    paymentRecord,
  });
});

exports.VerifyPayment = asyncHandler(async (req, res, next) => {
  // 1. Log user ID
  console.log("VerifyPayment called by user:", req.user.id);

  const user = await User.findById(req.user.id).select(
    "+creditsHistory billingHistory"
  );

  // 2. Log user doc (especially credits)
  console.log("Fetched user from DB:", {
    userId: user?._id,
    currentCredits: user?.credits,
    typeOfCredits: typeof user?.credits,
  });

  if (!user) {
    return res.status(400).json({ success: false, message: "User not found" });
  }

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  console.log("Received Razorpay details:", {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  });

  // 3. Generate expected signature
  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const expectedSignature = hmac.digest("hex");
  console.log("Expected signature:", expectedSignature);

  // 4. Find the payment record
  const paymentRecord = await Payment.findOne({
    paymentId: razorpay_order_id,
    user: user.id,
  });
  console.log("Fetched paymentRecord:", paymentRecord);

  if (!paymentRecord) {
    return res.status(400).json({ error: "Payment record not found" });
  }

  // 5. Compare signatures
  if (expectedSignature !== razorpay_signature) {
    console.log("Signatures do not match. Payment verification failed.");
    paymentRecord.status = "failed";
    await paymentRecord.save();

    // Optionally initiate a refund
    const refund = await razorpayInstance.payments.refund(razorpay_payment_id, {
      amount: paymentRecord.amount * 100,
    });
    paymentRecord.status = "refunded";
    await paymentRecord.save();

    return res.status(400).json({
      error: "Payment verification failed. Refund initiated.",
      refund,
    });
  }

  // 6. Mark paymentRecord as success
  paymentRecord.status = "success";
  await paymentRecord.save();
  console.log("Payment record updated to success.");

  // 7. If planType is credits, parse and add to user credits
  if (paymentRecord.planType === "credits") {
    console.log(
      "Plan type is credits. Raw paymentRecord.credits:",
      paymentRecord.credits,
      "type:",
      typeof paymentRecord.credits
    );

    // Safely parse credits
    const parsedCredits = parseInt(paymentRecord.credits, 10);
    console.log(
      "Parsed credits:",
      parsedCredits,
      "type:",
      typeof parsedCredits
    );

    console.log(
      "User credits before adding:",
      user.credits,
      "type:",
      typeof user.credits
    );
    user.credits += parsedCredits;
    console.log(
      "User credits after adding:",
      user.credits,
      "type:",
      typeof user.credits
    );

    user.creditsHistory.push({
      thingUsed: "purchase",
      creditsUsed: parsedCredits.toString(),
    });
    console.log("Pushed to creditsHistory:", parsedCredits.toString());
  } else if (paymentRecord.planType === "subscription") {
    console.log("Plan type is subscription:", paymentRecord.subscriptionType);
    user.subscription.type = paymentRecord.subscriptionType;
    user.subscription.timeStamp = new Date();
    user.setSubscriptionEndDate();
  }

  // 8. Save user
  try {
    console.log("About to save user with credits:", user.credits);
    await user.save();
    console.log("User saved successfully.");
  } catch (err) {
    console.error("Error on user.save():", err);
    return res.status(500).json({
      error: "Failed to update user after payment verification.",
      details: err.message,
    });
  }

  // 9. Generate and upload invoice, send email, etc.
  try {
    // Generate a unique random invoice number
    let randomInvoiceNo =
      "INV" + crypto.randomBytes(4).toString("hex").toUpperCase();
    let invoiceNoUnique = randomInvoiceNo;
    while (await InvoiceModel.findOne({ invoiceNo: invoiceNoUnique })) {
      invoiceNoUnique =
        "INV" + crypto.randomBytes(4).toString("hex").toUpperCase();
    }
    console.log("Using invoiceNoUnique:", invoiceNoUnique);

    // Generate customerNo
    const invoiceCount = await InvoiceModel.countDocuments();
    const customerNo = String(invoiceCount + 1).padStart(5, "0");
    console.log("Using customerNo:", customerNo);

    const formattedDate = new Date().toLocaleDateString();
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

    console.log(
      "Plan type label:",
      planTypeLabel,
      "| Plan description:",
      planDescription
    );

    const InvoiceHtml = invoiceHtml(
      customerNo,
      invoiceNoUnique,
      planTypeLabel,
      paymentRecord.amount,
      formattedDate,
      user.email,
      user.userName,
      planDescription
    );

    const pdfBuffer = await generatePdfBuffer(InvoiceHtml);
    const pdfKey = `invoices/invoice_${invoiceNoUnique}.pdf`;

    const pdfUploadUrl = await putObject(pdfBuffer, pdfKey, "application/pdf");
    console.log("PDF uploaded to S3:", pdfUploadUrl.url);

    // Save invoice details
    const newInvoice = new InvoiceModel({
      invoiceUrl: pdfUploadUrl.url,
      invoiceNo: invoiceNoUnique,
      customerNo: customerNo,
      user: user._id,
    });
    await newInvoice.save();
    console.log("Invoice saved to DB:", newInvoice._id);

    // Send invoice via email
    await sendEmailWithAttachments(
      user.email,
      "Your Invoice",
      "Please find attached your invoice.",
      pdfBuffer,
      pdfKey
    );
    console.log("Invoice emailed to:", user.email);

    // Update billing history
    user.billingHistory.push({
      paymentId: paymentRecord.paymentId,
      invoiceUrl: pdfUploadUrl.url,
      dateOfPurchase: new Date(),
      amount: paymentRecord.amount,
      planName:
        paymentRecord.planType === "credits"
          ? "credits"
          : paymentRecord.subscriptionType,
      creditsPurchased: paymentRecord.credits.toString(),
      creditsPrice: paymentRecord.amount.toString(),
    });
    console.log("Added to billingHistory.");

    await user.save();
    console.log("User updated with new billing history.");

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
