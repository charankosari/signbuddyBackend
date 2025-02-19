const { SESClient, SendEmailCommand } = require("@aws-sdk/client-ses");
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

const sendEmail = async (recipientEmail, subject, body) => {
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

module.exports = sendEmail;
