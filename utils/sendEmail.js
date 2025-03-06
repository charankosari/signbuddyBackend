const {
  SESClient,
  SendEmailCommand,
  SendRawEmailCommand,
} = require("@aws-sdk/client-ses");
require("events").EventEmitter.defaultMaxListeners = 20;
const { config } = require("dotenv");
config({ path: "config/config.env" });
const SES_CONFIG = {
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
};
const sesClient = new SESClient(SES_CONFIG);

exports.sendEmail = async (recipientEmail, subject, body) => {
  const params = {
    Source: process.env.AWS_SES_EMAIL,
    Destination: {
      ToAddresses: [recipientEmail],
    },
    Message: {
      Subject: {
        Data: subject,
      },
      Body: {
        Html: { Charset: "UTF-8", Data: body },
      },
    },
  };

  try {
    const command = new SendEmailCommand(params);
    const response = await sesClient.send(command);
    console.log("Email sent successfully:", response);
    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

exports.sendEmailWithAttachments = async (
  recipientEmail,
  subject,
  body,
  attachmentBuffer,
  attachmentName
) => {
  try {
    // Define a unique MIME boundary.
    const boundary = `----=_Part_${Date.now()}`;

    // Construct the raw MIME email message.
    const rawMessage = [
      `From: "SignBuddy" <official@signbuddy.in>`, // Replace with your verified sender email.
      `To: ${recipientEmail}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      `Content-Type: text/plain; charset="UTF-8"`,
      "Content-Transfer-Encoding: 7bit",
      "",
      body,
      "",
      `--${boundary}`,
      `Content-Type: application/pdf; name="${attachmentName}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${attachmentName}"`,
      "",
      attachmentBuffer.toString("base64"),
      "",
      `--${boundary}--`,
    ].join("\n");

    const params = {
      RawMessage: {
        Data: rawMessage,
      },
      Source: "official@signbuddy.in",
      Destinations: [recipientEmail],
    };

    const command = new SendRawEmailCommand(params);
    const response = await exports.s3Client.send(command);
    console.log("Email sent successfully:", response);
    return response;
  } catch (err) {
    console.error("Error sending email with attachment:", err);
    throw err;
  }
};
