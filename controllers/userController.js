const asyncHandler = require("../middleware/asynchandler");
const errorHandler = require("../utils/errorHandler");
const User = require("../models/userModel");
const sendJwt = require("../utils/jwttokenSend");
const sendEmail = require("../utils/sendEmail");
const crypto = require("crypto");
const TempOTP = require("../models/TempModel");
const DeletedAccounts = require("../models/DeletedAccounts");
const bcrypt = require("bcrypt");
const { Poppler } = require("node-poppler");
const { PDFDocument, rgb } = require("pdf-lib");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
const multer = require("multer");
const {
  putObject,
  deleteObject,

  UploadDocx,
} = require("../utils/s3objects");
const { processFile } = require("../utils/Ilovepdf");
const storage = multer.memoryStorage();
const { v4: uuidv4 } = require("uuid");
const generateAgreement = require("../utils/grokAi");
const PreUser = require("../models/preUsers");
const poppler = new Poppler();
const { getAvatarsList } = require("../utils/s3objects");
const { S3Client } = require("@aws-sdk/client-s3");
const { ListObjectsV2Command } = require("@aws-sdk/client-s3");
const { config } = require("dotenv");
const SendUsersWithNoAccount = require("../models/SendUsersWithNoAccount");
const { OAuth2Client } = require("google-auth-library");
config({ path: "config/config.env" });
// connection
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
exports.s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only .docx files are allowed"));
    }
  },
}).single("file");
const uploadDocs = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit file size to 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only .docx files are allowed"));
    }
  },
}).single("file");
const emailBody = (
  senderName,
  avatar,
  senderEmail,
  previewImageUrl,
  redirectUrl,
  name
) => {
  return `
  <!DOCTYPE html>
<html lang="en">3
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #121111; color: #ffffff;">
      <div style="background-color: #121111; color: #ffffff; text-align: left;">
        <a href="#" style="font-size: 28px; font-weight: 300; color: #ffffff; text-decoration: none; margin-bottom: 5px; display: block; letter-spacing: 1px;">SignBuddy</a>
        <span style="font-size: 14px; color: #cccccc; margin-bottom: 20px; display: block;">Bridging Communication Gaps</span>
      </div>

      <div style="padding: 30px; margin: 30px; background-color: #000000; border: 1px solid #333333; color: #ffffff;">
       <table style="margin-bottom: 20px;" cellspacing="0" cellpadding="0">
  <tr>
    <td style="vertical-align: top; padding-right: 12px;">
      <img src="${avatar}" alt="Profile Picture" style="width: 30px; height: 30px; border-radius: 50%;" />
    </td>
    <td style="vertical-align: middle;">
      <table cellspacing="0" cellpadding="0">
        <tr>
          <td style="font-size: 13px; font-weight: 600; line-height: 1.2; margin: 0;">
            ${senderName}
          </td>
        </tr>
        <tr>
          <td style="font-size: 13px; font-weight: 600; line-height: 1.2; margin: 0;">
            ${senderEmail}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>

        </div>

        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">Dear ${name},</p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          A document has been shared with you for your electronic signature through SignBuddy's secure digital signing platform.
        </p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          This document requires your attention and electronic signature to proceed. Our system ensures a secure, legally-binding signature
          process that complies with international e-signature regulations.
        </p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">To complete this process:</p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          1. Review the document preview below<br />
          2. Click the "Sign Document" button to access the full document<br />
          3. Follow the guided signing process<br />
          4. Receive your signed copy via email
        </p>
        <p style="font-size: 11px; line-height: 1.5; color: #f0f0f0; margin-bottom: 8px;">
          For security reasons, this signing link will expire in 72 hours. If you have any questions or need assistance, please contact our support
          team.
        </p>

        <img src="${previewImageUrl}" alt="document" style="width: 100%; max-width: 300px; height: 400px; object-fit: cover; margin: 25px auto; display: block; border: 1px solid #333; border-radius: 4px;" />

        <a href="${redirectUrl}" style="display: inline-block; padding: 12px 30px; background-color: #ffffff; color: #000000; text-decoration: none; border-radius: 4px; margin: 20px auto; display: block; width: fit-content; font-size: 13px; font-weight: 500;">Sign Document</a>
      </div>

      <div style="background-color: #121111; text-align: left; color: #6d6b6b; font-size: 12px;">
        <p style="font-size: 11px; line-height: 1.6; margin-bottom: 20px;color:#ffffff">
          SignBuddy is a cutting-edge electronic signature platform that combines security, simplicity, and legal compliance. Our mission is to
          streamline document signing processes while ensuring the highest standards of data protection and user experience.
        </p>
        <hr style="border: none; border-top: 1px solid #333333; margin: 15px 0;" />
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <p style="margin: 0; font-size: 10px;color:#8a8a8a">© 2025 SignBuddy. All rights reserved.</p>
          <p style="margin: 0; font-size: 10px;">
            <a href="#" style="margin-left: 15px; color: #8a8a8a;">Privacy Policy</a>
            <a href="#" style="margin-left: 15px; color: #8a8a8a;">Terms & Conditions</a>
          </p>
        </div>

        <div style="margin-top: 15px;">
       <a href="https://www.linkedin.com/" style="display:inline-block;">
  <svg width="24" height="24" fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M20.45 3H3.55C2.69 3 2 3.69 2 4.55v14.9C2 20.31 2.69 21 3.55 21h16.9c.86 0 1.55-.69 1.55-1.55V4.55C22 3.69 21.31 3 20.45 3zM8.337 17.125H5.578V9.375h2.759v7.75zM6.957 8.283a1.595 1.595 0 1 1 0-3.19 1.595 1.595 0 0 1 0 3.19zM18.42 17.125h-2.76v-3.738c0-.89-.018-2.038-1.24-2.038-1.24 0-1.43.967-1.43 1.97v3.806H10.23V9.375h2.64v1.067h.036c.369-.7 1.27-1.44 2.61-1.44 2.79 0 3.305 1.838 3.305 4.224v3.9z"/>
  </svg>
</a>

<a href="https://www.instagram.com/" style="display:inline-block;">
  <svg width="24" height="24" fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.75 2h8.5C19.54 2 22 4.46 22 7.75v8.5c0 3.29-2.46 5.75-5.75 5.75h-8.5C4.46 22 2 19.54 2 16.25v-8.5C2 4.46 4.46 2 7.75 2zM12 7.12a4.88 4.88 0 1 0 0 9.76 4.88 4.88 0 0 0 0-9.76zm0 8a3.12 3.12 0 1 1 0-6.24 3.12 3.12 0 0 1 0 6.24zM17.63 6.37a1.12 1.12 0 1 1-2.24 0 1.12 1.12 0 0 1 2.24 0z"/>
  </svg>
</a>

<a href="https://www.twitter.com/" style="display:inline-block;">
  <svg width="24" height="24" fill="#FFFFFF" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.23 5.924a8.38 8.38 0 0 1-2.415.662 4.216 4.216 0 0 0 1.849-2.323 8.3 8.3 0 0 1-2.644 1.012 4.187 4.187 0 0 0-7.234 3.814 11.86 11.86 0 0 1-8.605-4.362 4.2 4.2 0 0 0 1.297 5.596 4.176 4.176 0 0 1-1.894-.52v.052a4.19 4.19 0 0 0 3.355 4.104 4.17 4.17 0 0 1-1.887.072 4.2 4.2 0 0 0 3.92 2.915 8.39 8.39 0 0 1-6.157 1.723 11.83 11.83 0 0 0 6.4 1.872c7.675 0 11.876-6.36 11.876-11.876l-.014-.54a8.53 8.53 0 0 0 2.063-2.174z"/>
  </svg>
</a>


        </div>

        <div style="text-align: center; padding-top: 15px;">
          <p style="color: #6d6b6b; font-size: 10px; margin: 0;">
            Powered by SyncoreLabs
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
  `;
};

const signUpOtpMail = (otp) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your Email</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="max-width: 600px; margin: 0 auto"
          >
            <!-- Gray Section -->
            <tr>
              <td style="background-color: #dadadb; padding: 40px 30px">
                <!-- Logo -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="right">
                      <p style="margin: 0; font-size: 16px; font-weight: bold">
                        Signbuddy
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Email Icon with Lines -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0 20px"
                >
                  <tr>
                    <td align="center">
                      <div style="display: inline-block" class="icon-container">
                        <div
                          style="
                            border-top: 1px solid #666666;
                            width: 100px;
                            margin-right: 15px;
                            display: inline-block;
                            vertical-align: middle;
                          "
                          class="decorative-line"
                        ></div>
                        <img
                          src="https://signbuddy.s3.ap-south-1.amazonaws.com/mail.png"
                          alt="Email Icon"
                          style="
                            width: 24px;
                            height: 24px;
                            vertical-align: middle;
                          "
                        />
                        <div
                          style="
                            border-top: 1px solid #666666;
                            width: 100px;
                            margin-left: 15px;
                            display: inline-block;
                            vertical-align: middle;
                          "
                          class="decorative-line"
                        ></div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Titles -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <h2
                        style="
                          margin: 0 0 15px;
                          font-size: 20px;
                          color: #000000;
                        "
                        class="signup-title"
                      >
                        Thanks for Signing up!
                      </h2>
                      <h1
                        style="margin: 0; font-size: 28px; color: #000000"
                        class="verify-title"
                      >
                        Verify your E-Mail Address
                      </h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Black Section -->
            <tr>
              <td style="background-color: #09090b; padding: 40px 30px">
                <!-- Rest of the content remains the same -->
                <!-- Greeting -->
                <p style="color: #ffffff; margin: 0 0 20px; font-size: 16px">
                  Hey there,
                </p>
                <!-- Message -->
                <p style="color: #ffffff; margin: 0 0 20px; font-size: 16px">
                  We received your request for Email Verification on Signbuddy.
                </p>
                <p style="color: #ffffff; margin: 0 0 20px; font-size: 16px">
                  Here is your OTP to proceed:
                </p>
                <!-- OTP Section -->
                <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                role="presentation"
              >
                <tr>
                  <td align="left" style="padding: 20px 0">
                    <table
                      cellpadding="0"
                      cellspacing="0"
                      role="presentation"
                    >
                      <tr>
                        ${otp
                          .split("")
                          .map(
                            (digit) => `
                        <td style="padding: 0 5px">
                          <div
                            style="
                              background-color: #1a1a1a;
                              border: 1px solid #333;
                              padding: 10px 15px;
                              border-radius: 4px;
                            "
                          >
                            <span
                              style="
                                color: #ffffff;
                                font-size: 24px;
                                font-weight: bold;
                              "
                              >${digit}</span
                            >
                          </div>
                        </td>
                        `
                          )
                          .join("")}
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
                <!-- Validity Message -->
                <p
                  style="
                    color: #ffffff;
                    margin: 20px 0;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  This OTP will be valid for the next 10 minutes, please enter
                  the OTP in the specified field to continue with your account.
                </p>
                <!-- Report Message -->
                <p style="color: #666666; margin: 20px 0 0; font-size: 14px">
                  If you didn't request this, please report to us at
                  <a
                    href="mailto:official@signbuddy.in"
                    style="color: #007bff; text-decoration: none"
                    >official@signbuddy.in</a
                  >
                </p>
                <!-- Description -->
                <p
                  style="
                    color: #666666;
                    margin: 30px 0 0;
                    font-size: 12px;
                    line-height: 1.5;
                  "
                >
                  SignBuddy is a smart, affordable digital signing platform
                  designed for seamless document management. Users can sign up,
                  create or upload documents, and send them via email for
                  signatures. The first three documents are free, making it
                  accessible for individuals and businesses. AI-powered
                  assistance helps in document creation, saving time and effort.
                  Secure, legally binding e-signatures ensure compliance with
                  industry standards. Affordable pricing makes it a great
                  alternative to costly solutions like DocuSign. Sign documents
                  from anywhere, on any device, with a simple and intuitive
                  interface. Streamline your workflow with SignBuddy - where
                  signing documents is effortless.
                </p>
                <!-- Footer -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="margin-top: 30px; border-top: 1px solid #333"
                >
                  <tr>
                    <td style="padding-top: 20px">
                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td style="color: #666666; font-size: 10px">
                            Copyright © 2025 SignFastly. All Rights Reserved.
                          </td>
                          <td align="right">
                            <a
                              href="#"
                              style="
                                color: #666666;
                                text-decoration: underline;
                                font-size: 10px;
                                padding: 0 10px;
                              "
                              >Privacy Policy</a
                            >
                            <a
                              href="#"
                              style="
                                color: #666666;
                                text-decoration: underline;
                                font-size: 10px;
                                padding: 0 10px;
                              "
                              >Terms & Conditions</a
                            >
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 20px">
                      <p style="color: #666666; font-size: 12px; margin: 0">
                        Powered by <strong>Syncore Labs</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  <!-- Add this at the end of your file, just before </body> -->
  <!--[if !mso]><!-->
  <style>
    @media screen and (max-width: 600px) {
      .signup-title {
        font-size: 20px !important;
        margin-bottom: 10px !important;
      }
      .verify-title {
        font-size: 26px !important;
      }
    }

    @media screen and (max-width: 400px) {
      .signup-title {
        font-size: 18px !important;
        margin-bottom: 8px !important;
      }
      .verify-title {
        font-size: 22px !important;
      }
    }
  </style>
  <!--<![endif]-->
</html>
 
`;
};
const VerifyEmailTemplate = (otp, name) => {
  return `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify your Email</title>
  </head>
  <body style="margin: 0; padding: 0; font-family: Arial, sans-serif">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="max-width: 600px; margin: 0 auto"
          >
            <!-- Gray Section -->
            <tr>
              <td style="background-color: #dadadb; padding: 40px 30px">
                <!-- Logo -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="right">
                      <p style="margin: 0; font-size: 16px; font-weight: bold">
                        Signbuddy
                      </p>
                    </td>
                  </tr>
                </table>

                <!-- Email Icon with Lines -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  style="margin: 30px 0 20px"
                >
                  <tr>
                    <td align="center">
                      <div style="display: inline-block" class="icon-container">
                        <div
                          style="
                            border-top: 1px solid #666666;
                            width: 100px;
                            margin-right: 15px;
                            display: inline-block;
                            vertical-align: middle;
                          "
                          class="decorative-line"
                        ></div>
                        <img
                          src="https://signbuddy.s3.ap-south-1.amazonaws.com/mail.png"
                          alt="Email Icon"
                          style="
                            width: 24px;
                            height: 24px;
                            vertical-align: middle;
                          "
                        />
                        <div
                          style="
                            border-top: 1px solid #666666;
                            width: 100px;
                            margin-left: 15px;
                            display: inline-block;
                            vertical-align: middle;
                          "
                          class="decorative-line"
                        ></div>
                      </div>
                    </td>
                  </tr>
                </table>

                <!-- Titles -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td align="center">
                      <h2
                        style="
                          margin: 0 0 15px;
                          font-size: 16px;
                          color: #2a2a2a;
                        "
                        class="signup-title"
                      >
                        Change your Email Address
                      </h2>
                      <h1
                        style="margin: 0; font-size: 24px; color: #000000"
                        class="verify-title"
                      >
                        Verify your E-Mail Address
                      </h1>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Black Section -->
            <tr>
              <td style="background-color: #09090b; padding: 40px 30px">
                <!-- Rest of the content remains the same -->
                <!-- Greeting -->
                <p style="color: #ffffff; margin: 0 0 20px; font-size: 16px">
                  Hey there ${name},
                </p>
                <!-- Message -->
                <p style="color: #ffffff; margin: 0 0 20px; font-size: 16px">
                  We received your request for Email Verification on Signbuddy.
                </p>
                <p style="color: #ffffff; margin: 0 0 20px; font-size: 16px">
                  Here is your OTP to proceed:
                </p>
                <!-- OTP Section -->
               <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="left" style="padding: 20px 0">
                      <table
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          ${otp
                            .split("")
                            .map(
                              (digit) => `
                          <td style="padding: 0 5px">
                            <div
                              style="
                                background-color: #1a1a1a;
                                border: 1px solid #333;
                                padding: 10px 15px;
                                border-radius: 4px;
                              "
                            >
                              <span
                                style="
                                  color: #ffffff;
                                  font-size: 24px;
                                  font-weight: bold;
                                "
                                >${digit}</span
                              >
                            </div>
                          </td>
                          `
                            )
                            .join("")}
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <!-- Validity Message -->
                <p
                  style="
                    color: #ffffff;
                    margin: 20px 0;
                    font-size: 16px;
                    line-height: 1.6;
                  "
                >
                  This OTP will be valid for the next 10 minutes, please enter
                  the OTP in the specified field to continue with your account.
                </p>
                <!-- Report Message -->
                <p style="color: #666666; margin: 20px 0 0; font-size: 14px">
                  If you didn't request this, please report to us at
                  <a
                    href="mailto:official@signbuddy.in"
                    style="color: #007bff; text-decoration: none"
                    >official@signbuddy.in</a
                  >
                </p>
                <!-- Description -->
                <p
                  style="
                    color: #666666;
                    margin: 30px 0 0;
                    font-size: 12px;
                    line-height: 1.5;
                  "
                >
                  SignBuddy is a smart, affordable digital signing platform
                  designed for seamless document management. Users can sign up,
                  create or upload documents, and send them via email for
                  signatures. The first three documents are free, making it
                  accessible for individuals and businesses. AI-powered
                  assistance helps in document creation, saving time and effort.
                  Secure, legally binding e-signatures ensure compliance with
                  industry standards. Affordable pricing makes it a great
                  alternative to costly solutions like DocuSign. Sign documents
                  from anywhere, on any device, with a simple and intuitive
                  interface. Streamline your workflow with SignBuddy - where
                  signing documents is effortless.
                </p>
                <!-- Footer -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                  style="margin-top: 30px; border-top: 1px solid #333"
                >
                  <tr>
                    <td style="padding-top: 20px">
                      <table
                        width="100%"
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                      >
                        <tr>
                          <td style="color: #666666; font-size: 10px">
                            Copyright © 2025 SignFastly. All Rights Reserved.
                          </td>
                          <td align="right">
                            <a
                              href="#"
                              style="
                                color: #666666;
                                text-decoration: underline;
                                font-size: 10px;
                                padding: 0 10px;
                              "
                              >Privacy Policy</a
                            >
                            <a
                              href="#"
                              style="
                                color: #666666;
                                text-decoration: underline;
                                font-size: 10px;
                                padding: 0 10px;
                              "
                              >Terms & Conditions</a
                            >
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding-top: 20px">
                      <p style="color: #666666; font-size: 12px; margin: 0">
                        Powered by <strong>Syncore Labs</strong>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  <!-- Add this at the end of your file, just before </body> -->
  <!--[if !mso]><!-->
  <style>
    @media screen and (max-width: 600px) {
      .signup-title {
        font-size: 20px !important;
        margin-bottom: 10px !important;
      }
      .verify-title {
        font-size: 26px !important;
      }
    }

    @media screen and (max-width: 400px) {
      .signup-title {
        font-size: 18px !important;
        margin-bottom: 8px !important;
      }
      .verify-title {
        font-size: 22px !important;
      }
    }
  </style>
  <!--<![endif]-->
</html>

`;
};

const formatTimeAgo = (date) => {
  const now = new Date();
  const diff = Math.floor((now - date) / 1000); // Difference in seconds

  if (diff < 60) return `${diff} seconds ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} days ago`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)} months ago`;
  return `${Math.floor(diff / 31536000)} years ago`;
};
const emailForPreuser = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Thanks for Joining the waitlist!</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #242424;
      font-family: Arial, sans-serif;
    "
  >
    <table
      class="container"
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="
        border-collapse: collapse;
        width: 100%;
        max-width: 600px;
        margin: 0 auto;
      "
    >
      <tr>
        <td style="padding: 20px 20px 0px">
          <!-- Header Section -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              background-color: #dadadb;
              padding: 24px 32px 0;
              max-width: 100%;
            "
            class="header"
          >
            <!--[if !mso]><!-->
            <tr
              style="
                display: flex;
                flex-direction: row;
                max-width: 100%;
                width: 100%;
              "
            >
              <!--<![endif]-->
              <!--[if mso]>
            <tr>
            <![endif]-->
              <td
                width="45%"
                style="
                  vertical-align: bottom;
                  padding-bottom: 0;
                  display: inline-block;
                  width: 45%;
                  min-width: 200px;
                  flex: 1;
                "
              >
                <img
                  src="https://signbuddy.s3.ap-south-1.amazonaws.com/person-image.png"
                  alt="a person greeting"
                  id="person_header"
                  style="
                    -ms-interpolation-mode: bicubic;
                    border: 0;
                    height: auto;
                    line-height: 100%;
                    outline: none;
                    text-decoration: none;
                    width: 100%;
                    display: block;
                    margin-bottom: -1px;
                    max-width: 100%;
                    margin: 0 auto;
                  "
                />
              </td>
              <td
                style="
                  vertical-align: top;
                  padding: 20px 10px 0px;
                  display: inline-block;
                  width: 55%;
                  min-width: 200px;
                  flex: 1;
                "
              >
                <p
                  style="
                    margin: 0;
                    text-align: right;
                    font-size: 16px;
                    font-weight: 700;
                    margin-bottom: 20px;
                    max-width: 100%;
                  "
                  class="header-text"
                >
                  Signbuddy
                </p>
                <p
                  style="
                    font-size: 28px;
                    font-weight: bold;
                    color: #09090b;
                    margin: 0;
                    text-align: right;
                    max-width: 100%;
                  "
                  class="thanks"
                >
                  Thanks for joining the waitlist!
                </p>
              </td>
            </tr>
          </table>

          <!-- Black Section -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="background-color: #09090b; color: #ffffff; padding: 32px"
          >
            <tr>
              <td>
                <!-- Thank You Message -->
                <p
                  style="
                    font-size: 14px;
                    line-height: 1.5;
                    color: #dadadb;
                    margin-bottom: 8px;
                  "
                >
                  Thank you for joining the <strong>SignBuddy</strong> waitlist!
                  We're excited to have you onboard as we prepare to launch our
                  digital signing platform. We're giving you 100 Free Credits
                  which could be used when the application is launched.
                </p>
                <p
                  style="
                    font-size: 14px;
                    line-height: 1.5;
                    color: #dadadb;
                    margin-bottom: 8px;
                  "
                >
                  Stay tuned! we'll be live way sooner that you expect. If you
                  have any questions, feel free to reply to this email.
                </p>
                <p
                  style="
                    font-size: 14px;
                    line-height: 1.5;
                    color: #dadadb;
                    margin-bottom: 32px;
                  "
                >
                  Best Regards<br />
                  - Team SignBuddy
                </p>

                <!-- Credits Section -->
                <table
                  width="100%"
                  cellpadding="0"
                  cellspacing="0"
                  role="presentation"
                >
                  <tr>
                    <td align="center">
                      <table
                        cellpadding="0"
                        cellspacing="0"
                        role="presentation"
                        style="
                          background-color: #242424;
                          padding: 16px;
                          border-radius: 4px;
                          margin: auto;
                        "
                      >
                        <tr>
                          <td>
                            <img
                              src="https://signbuddy.s3.ap-south-1.amazonaws.com/credits-icon.png"
                              alt="credits icon"
                              style="
                                width: 24px;
                                height: 24px;
                                vertical-align: middle;
                                -ms-interpolation-mode: bicubic;
                                border: 0;
                                line-height: 100%;
                                outline: none;
                                text-decoration: none;
                              "
                            />
                            <span
                              style="
                                font-size: 24px;
                                font-weight: bold;
                                vertical-align: middle;
                              "
                              >100 Credits</span
                            >
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <p
                  style="
                    font-size: 14px;
                    text-align: center;
                    color: #dadadb;
                    font-weight: 600;
                  "
                >
                  Here are your benefits for trusting at our initial stages
                </p>

                <!-- Footer -->
                <div style="margin-top: 32px">
                  <p
                    style="
                      font-size: 12px;
                      color: #7a7a81;
                      line-height: 1.5;
                      margin: 0;
                    "
                  >
                    SignBuddy is a smart, affordable digital signing platform
                    designed for seamless document management. Users can sign
                    up, create or upload documents, and send them via email for
                    signatures. The first three documents are free, making it
                    accessible for individuals and businesses. AI-powered
                    assistance helps in document creation, saving time and
                    effort. Secure, legally binding e-signatures ensure
                    compliance with industry standards. Affordable pricing makes
                    it a great alternative to costly solutions like DocuSign.
                    Sign documents from anywhere, on any device, with a simple
                    and intuitive interface. Streamline your workflow with
                    SignBuddy - where signing documents is effortless.
                  </p>
                  <div
                    style="border-top: 1px solid #404040; margin: 20px 0"
                  ></div>
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                    class="footer-copyright"
                  >
                    <tr>
                      <td style="text-align: left">
                        <p style="font-size: 10px; color: #7a7a81; margin: 0">
                          Copyright © 2025 SignFastly. All Rights Reserved.
                        </p>
                      </td>
                      <td style="text-align: right">
                        <a
                          href="#"
                          style="
                            color: #666666;
                            text-decoration: underline;
                            font-size: 10px;
                            padding: 0 10px;
                          "
                          >Privacy Policy</a
                        >

                        <a
                          href="#"
                          style="
                            color: #666666;
                            text-decoration: underline;
                            font-size: 10px;
                            padding: 0 10px;
                          "
                          >Terms & Conditions</a
                        >
                      </td>
                    </tr>
                  </table>
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                  >
                    <tr>
                      <td align="center">
                        <p
                          style="
                            font-size: 12px;
                            color: #7a7a81;
                            text-align: center;
                          "
                        >
                          Powered by <strong>Syncore Labs </strong>
                        </p>
                      </td>
                    </tr>
                  </table>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Media Query Styles -->
    <!--[if !mso]><!-->
    <style>
      @media only screen and (max-width: 600px) {
        .footer-copyright tr {
          display: flex !important;
          flex-direction: column !important;
        }
        .footer-copyright td {
          width: 100% !important;
          text-align: center !important;
          padding: 4px 0 !important;
        }
        .header tr {
          display: flex !important;
          flex-direction: column-reverse !important;
          width: 100% !important;
        }
        .header td {
          width: 100% !important;
          text-align: center !important;
          padding: 0 !important;
          flex: none !important;
        }
        .header img {
          width: 50% !important;
          margin: 0 auto !important;
        }
        .header-text {
          text-align: center !important;
          margin-bottom: 12px !important;
        }
        .thanks {
          font-size: 20px !important;
          text-align: center !important;
          margin-bottom: 20px !important;
        }
        .message-text {
          font-size: 12px !important;
        }
        .black-section {
          padding: 20px !important;
        }
        .credits-text {
          font-size: 16px !important;
        }
        #credits_icon {
          width: 16px !important;
          height: 16px !important;
        }
        .credits-container {
          padding: 12px !important;
        }
        .benefits-title {
          font-size: 12px !important;
        }
        .footer {
          margin-top: 20px !important;
        }
        .footer-copyright td {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
        }
        .footer-text {
          margin-bottom: 16px !important;
        }
      }

      @media only screen and (max-width: 450px) {
        .header td {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
        }
        .header-text {
          text-align: center !important;
          margin-bottom: 0 !important;
          font-size: 10px !important;
        }
        .thanks {
          font-size: 16px !important;
          margin: 8px 0px 12px !important;
          text-align: center !important;
        }
        #person_header {
          margin: 0 auto !important;
          display: block !important;
        }
      }
    </style>
    <!--<![endif]-->
  </body>
</html>
`;
exports.sendOTP = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new errorHandler("Email is required", 400));
  }
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new errorHandler("Email already exists"));
  }
  const otp = crypto.randomInt(1000, 9999).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  await TempOTP.findOneAndUpdate(
    { email },
    { otp: hashedOtp, createdAt: new Date() },
    { upsert: true, new: true }
  );
  const subject = "Your OTP Code";
  const body = signUpOtpMail(otp);
  sendEmail(email, subject, body);
  res.status(200).json({ success: true, message: "OTP sent to email" });
});

exports.register = asyncHandler(async (req, res, next) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    return next(new errorHandler("Email, OTP, and Password are required", 400));
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new errorHandler("Email already registered", 400));
  }

  if (!passwordRegex.test(password)) {
    return next(
      new errorHandler(
        "Password must include at least one letter, one number, and one special character",
        400
      )
    );
  }

  const tempOTP = await TempOTP.findOne({ email });
  if (!tempOTP) {
    return next(new errorHandler("OTP expired or email not found", 400));
  }

  const matchOtp = await bcrypt.compare(String(otp), tempOTP.otp);
  if (!matchOtp) {
    return next(new errorHandler("Invalid OTP", 400));
  }

  // Create the user
  const user = await User.create({ email, password });

  const deletedAccount = await DeletedAccounts.findOne({ email });
  if (deletedAccount) {
    user.credits = deletedAccount.credits;
    message =
      "Registration successful. Your previous credits have been restored.";
    await DeletedAccounts.deleteOne({ email });
  } else {
    // Check if the email exists in PreUser. If so, assign 100 credits.
    const preUser = await PreUser.findOne({ email });
    if (preUser) {
      user.credits = 100;
      message =
        "Registration successful. You have been rewarded with 100 credits.";
      await PreUser.deleteOne({ email });
    } else {
      // If neither record exists, assign 30 credits.
      user.credits = 30;
      message =
        "Registration successful. You have been awarded with 30 credits.";
    }
  }

  // Check if this email exists in SendUsersWithNoAccount.
  const sendUserRecord = await SendUsersWithNoAccount.findOne({ email });
  if (sendUserRecord) {
    // Merge incoming agreements from sendUserRecord to user's incomingAgreements.
    if (
      sendUserRecord.incomingAgreements &&
      sendUserRecord.incomingAgreements.length > 0
    ) {
      user.incomingAgreements = user.incomingAgreements.concat(
        sendUserRecord.incomingAgreements
      );
    }
    // Delete the record from SendUsersWithNoAccount.
    await SendUsersWithNoAccount.deleteOne({ email });
  }

  // Remove the used OTP
  await TempOTP.deleteOne({ email });

  // Save the updated user with credits and incoming agreements.
  await user.save();

  res.status(201);
  sendJwt(user, 200, message, res);
});

exports.googleAuth = asyncHandler(async (req, res, next) => {
  const { token } = req.body;

  if (!token) {
    return next(new errorHandler("Google token is required", 400));
  }

  let ticket;
  try {
    // Verify the token using the Google client
    ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (error) {
    return next(new errorHandler("Invalid Google token", 400));
  }

  const payload = ticket.getPayload();
  const { email, name } = payload;

  // Check if user already exists
  let user = await User.findOne({ email });
  let message = "";
  let navigationUrl = "";

  if (user) {
    // Existing user: send token & navigate to dashboard
    message = "Google authentication successful";
    navigationUrl = "/dashboard";
    return sendJwt(user, 200, { message, navigationUrl }, res);
  }

  // New user flow
  user = new User({ email, userName: name });

  // Check if the email exists in PreUser => grant 100 credits
  const deletedAccount = await DeletedAccounts.findOne({ email });
  if (deletedAccount) {
    user.credits = deletedAccount.credits;
    message =
      "Registration successful. Your previous credits have been restored.";
    await DeletedAccounts.deleteOne({ email });
  } else {
    // Check if the email exists in PreUser. If so, assign 100 credits.
    const preUser = await PreUser.findOne({ email });
    if (preUser) {
      user.credits = 100;
      message =
        "Registration successful. You have been rewarded with 100 credits.";
      await PreUser.deleteOne({ email });
    } else {
      // If neither record exists, assign 30 credits.
      user.credits = 30;
      message =
        "Registration successful. You have been awarded with 30 credits.";
    }
  }

  // Check if this email exists in SendUsersWithNoAccount
  const sendUserRecord = await SendUsersWithNoAccount.findOne({ email });
  if (sendUserRecord) {
    if (
      sendUserRecord.incomingAgreements &&
      sendUserRecord.incomingAgreements.length > 0
    ) {
      user.incomingAgreements = user.incomingAgreements.concat(
        sendUserRecord.incomingAgreements
      );
    }
    // Delete the record from SendUsersWithNoAccount
    await SendUsersWithNoAccount.deleteOne({ email });
  }
  // Save the new user
  await user.save();

  // Navigate to profile setup for newly created users
  navigationUrl = "/profile-setup";
  return sendJwt(user, 200, { message, navigationUrl }, res);
});

//user login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Ensure user exists and fetch password
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  // Compare password using bcrypt
  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: "Invalid credentials" });
  }

  sendJwt(user, 200, "Login successful", res);
});

// change password
exports.changePassword = asyncHandler(async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;

  const user = await User.findById(req.user.id).select("+password");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // If no password is set, assume user signed up with email only.
  if (!user.password) {
    user.password = newPassword;
    await user.save();
    return res.status(200).json({ message: "Password set successfully" });
  }

  // Otherwise, compare the provided old password.
  const isMatch = await user.comparePassword(oldPassword);
  if (!isMatch) {
    return res.status(400).json({ message: "Old password not matched" });
  }

  user.password = newPassword;
  await user.save();

  res.status(200).json({ message: "Password changed successfully" });
});

// my details
exports.userDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  const templatesCount = user.templates.length;

  // Calculate total documents count (documentsSent + drafts)
  const totalDocuments = user.documentsSent.length + user.drafts.length;

  // Documents in which all recipients have signed
  const completedDocuments = user.documentsSent.filter(
    (doc) =>
      doc.recipients.length > 0 &&
      doc.recipients.every((recipient) => recipient.status === "signed")
  ).length;

  // Documents that have at least one pending recipient
  const pendingDocuments = user.documentsSent.filter((doc) =>
    doc.recipients.some((recipient) => recipient.status === "pending")
  ).length;

  res.status(200).send({
    success: true,
    user,
    templatesCount,
    totalDocuments,
    completedDocuments,
    pendingDocuments,
  });
});
// update details
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  const { avatar, userName } = req.body;
  if (!user) {
    return next(new errorHandler("Login to access this resource", 400));
  }
  user.avatar = avatar;
  user.userName = userName;
  await user.save();
  res.status(200).send({ success: true, user });
});

exports.addTemplate = (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to make a template", 400));
  }
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const fileName = `templates/${Date.now()}-${req.file.originalname}`;

      const file = req.file;

      const result = await UploadDocx(file, fileName);

      if (result.status !== 200) {
        return res.status(500).json({ error: "Failed to upload file" });
      }
      const template = {
        fileKey: fileName,
        fileUrl: result,
        uploadedAt: new Date(),
      };

      user.templates.push(template);
      await user.save();
      res.status(201).json({
        message: "File uploaded successfully",
        fileUrl: result,
        key: result.key,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};
exports.addDraft = (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to make a template", 400));
  }
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    try {
      const fileName = `drafts/${Date.now()}-${req.file.originalname}`;

      const file = req.file;
      const result = await UploadDocx(file, fileName);

      if (result.status !== 200) {
        return res.status(500).json({ error: "Failed to upload file" });
      }
      const draft = {
        fileKey: fileName,
        fileUrl: result,
        uploadedAt: new Date(),
      };

      user.drafts.push(draft);
      await user.save();
      res.status(201).json({
        message: "File uploaded successfully",
        fileUrl: result,
        key: fileName,
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
};

exports.deleteTemplate = async (req, res) => {
  const user = User.findById(req.user.id);
  if (!user) {
    return next(new errorHandler("Login to make a template", 400));
  }
  try {
    const { key } = req.body;

    if (!key) {
      return res.status(400).json({ error: "File key is required" });
    }

    const result = await deleteObject(key);

    if (result.status !== 204) {
      return res.status(500).json({ error: "Failed to delete file" });
    }

    res.status(200).json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.agreeDocument = asyncHandler(async (req, res, next) => {
  try {
    const { senderEmail, documentKey } = req.body;
    if (!senderEmail || !documentKey) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // 1. Parse placeholders array from the request body.
    let placeholdersFromReq = [];
    if (req.body.placeholders) {
      try {
        placeholdersFromReq = JSON.parse(req.body.placeholders);
      } catch (parseErr) {
        return res.status(400).json({ error: "Invalid JSON in placeholders" });
      }
    }

    // 2. Find sender user and present user
    const senderUser = await User.findOne({ email: senderEmail });
    if (!senderUser) {
      return res.status(404).json({ error: "Sender user not found" });
    }
    const presentUser = await User.findById(req.user.id);
    if (!presentUser) {
      return res.status(404).json({ error: "Present user not found" });
    }

    // 3. Locate the document in senderUser.documentsSent by documentKey
    const document = senderUser.documentsSent.find(
      (doc) => doc.documentKey === documentKey
    );
    if (!document) {
      return res
        .status(404)
        .json({ error: "Document not found in sender user's documentsSent" });
    }

    // 4. Mark the recipient whose email matches the present user as "signed"
    const recipient = document.recipients.find(
      (r) => r.email === presentUser.email
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found in document" });
    }
    recipient.status = "signed";
    recipient.statusTime = new Date();

    for (const phReq of placeholdersFromReq) {
      const { email, type, value } = phReq;
      const docPlaceholder = document.placeholders.find(
        (p) => p.email === email && p.type === type
      );

      if (!docPlaceholder) {
        continue;
      }

      if (type === "signature" && email === presentUser.email) {
        if (!req.file) {
          continue;
        }
        const tempDir = path.join(__dirname, "../temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const signatureId = uuidv4();
        const imageFile = `${signatureId}.jpg`;
        const tempFilePath = path.join(tempDir, imageFile);
        fs.writeFileSync(tempFilePath, req.file.buffer);
        const imageBuffer = fs.readFileSync(tempFilePath);
        const imagesFolder = `signatures/${documentKey}`;
        const imageKey = `${imagesFolder}/${imageFile}`;
        const imageUpload = await putObject(imageBuffer, imageKey, "image/png");
        if (imageUpload.status !== 200) {
          return res
            .status(500)
            .json({ error: "Failed to upload signature image" });
        }
        docPlaceholder.value = imageUpload.url;
        fs.unlinkSync(tempFilePath);
      }
      // If it's text or date, set docPlaceholder.value from phReq.value
      else if ((type === "text" || type === "date") && value) {
        docPlaceholder.value = value;
      }
    }

    // Save the updated senderUser
    await senderUser.save();

    // 6. If all recipients have signed, generate the final PDF with overlays
    const allSigned = document.recipients.every((r) => r.status === "signed");
    if (allSigned) {
      const pdfDoc = await PDFDocument.create();

      for (const pageImageUrl of document.ImageUrls) {
        const response = await axios.get(pageImageUrl, {
          responseType: "arraybuffer",
        });
        const embeddedPage = await pdfDoc.embedJpg(response.data);
        const pageWidth = embeddedPage.width;
        const pageHeight = embeddedPage.height;
        const page = pdfDoc.addPage([pageWidth, pageHeight]);

        // Draw the original page image
        page.drawImage(embeddedPage, {
          x: 0,
          y: 0,
          width: pageWidth,
          height: pageHeight,
        });

        // Overlay placeholders
        for (const ph of document.placeholders) {
          if (ph.value) {
            const posX = (parseFloat(ph.position.x) / 100) * pageWidth;
            const posY = (parseFloat(ph.position.y) / 100) * pageHeight;
            const width = (parseFloat(ph.size.width) / 100) * pageWidth;
            const height = (parseFloat(ph.size.height) / 100) * pageHeight;

            if (ph.type === "signature") {
              try {
                console.log(ph.value);
                const sigResponse = await axios.get(ph.value, {
                  responseType: "arraybuffer",
                });
                // Choose embedPng or embedJpg based on your image format
                const embeddedSig = await pdfDoc.embedPng(sigResponse.data);
                // Removed the reference to undefined variable sigBytes
                page.drawImage(embeddedSig, {
                  x: posX,
                  y: posY,
                  width,
                  height,
                });
              } catch (err) {
                console.error(
                  `Error overlaying signature for ${ph.email}:`,
                  err
                );
              }
            } else if (ph.type === "text" || ph.type === "date") {
              // Draw text
              page.drawText(ph.value, {
                x: posX,
                y: posY,
                size: 12,
                color: rgb(0, 0, 0),
              });
            }
          }
        }
      }

      // Save the PDF and upload
      const pdfBytes = await pdfDoc.save();
      const pdfKey = `signedDocuments/${documentKey}.pdf`;
      const pdfUpload = await putObject(pdfBytes, pdfKey, "application/pdf");
      if (pdfUpload.status !== 200) {
        return res
          .status(500)
          .json({ error: "Failed to upload final signed PDF" });
      }
      console.log("Final signed PDF URL:", pdfUpload.url);
      document.signedDocument = pdfUpload.url;
    }
    await senderUser.save();
    document.res.status(200).json({
      message: "Placeholders updated successfully",
    });
  } catch (error) {
    console.error("Error in agreeDocument:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.viewedDocument = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized user" });
    }
    const { documentKey, senderEmail } = req.body;

    if (!documentKey || !senderEmail) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const sender = await User.findOne({ email: senderEmail });

    if (!sender) {
      return res.status(404).json({ error: "Sender not found" });
    }
    const document = sender.documentsSent.find(
      (doc) => doc.documentKey === documentKey
    );
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    const recipient = document.recipients.find(
      (rec) => rec.email === user.email
    );
    if (!recipient) {
      return res.status(404).json({ error: "Recipient not found in document" });
    }

    recipient.status = "viewed";
    recipient.statusTime = new Date();
    await sender.save();
    const subject = "viewed document";
    const body = `<h1>${user.userName} viewed document </h1>`;
    sendEmail(senderEmail, subject, body);
    return res
      .status(200)
      .json({ message: "Document status updated to viewed" });
  } catch (error) {
    console.error("Error updating document status:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.createAgreement = asyncHandler(async (req, res) => {
  try {
    const { prompt, type } = req.body;
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    if (user.subscriptionType === "free" && user.credits === 0) {
      return res
        .status(400)
        .json({ error: "Free users are not able to use AI features " });
    }
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    if (user.cooldownPeriod && new Date() > user.cooldownPeriod) {
      user.cooldownPeriod = null;
      user.creditsUsedInMembership = 0;
      await user.save();
    }
    const creditsRequired = type === "section" ? 4 : 10;
    const now = new Date();
    if (user.subscriptionType !== "free") {
      if (
        !user.cooldownPeriod &&
        user.creditsUsedInMembership + creditsRequired > 4000
      ) {
        user.cooldownPeriod = new Date(now.getTime() + 6 * 60 * 60 * 1000);
      }
    }
    if (user.cooldownPeriod && user.cooldownPeriod > now) {
      if (user.credits < creditsRequired) {
        return res.status(403).json({
          error: "You are in cooldown period and have insufficient credits.",
        });
      } else {
        user.credits -= creditsRequired;
      }
    } else {
      if (user.subscriptionType === "free" && user.credits < creditsRequired) {
        return res.status(403).json({ error: "Insufficient credits." });
      }

      user.creditsUsedInMembership += creditsRequired;
      user.credits -= creditsRequired;
    }

    // Generate agreement using Grok API
    const agreementText = await generateAgreement(prompt, type || "full");

    await user.save();

    return res.status(200).json({ agreement: agreementText });
  } catch (error) {
    console.error("Error generating agreement:", error);
    res.status(500).json({ error: error.message });
  }
});

exports.getEmails = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const existingUser = await PreUser.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }
    const newPreUser = new PreUser({ email });
    await newPreUser.save();
    const subject = "Joined the waitlist!";
    sendEmail(email, subject, emailForPreuser);

    res.status(201).json({ message: "Email saved successfully", email });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
};
exports.recentDocuments = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });

  let avatars = [];
  try {
    avatars = await getAvatarsList();
  } catch (error) {
    console.error("Error fetching avatars:", error);
  }

  const recentDocs = user.documentsSent.map((doc) => {
    const {
      documentKey,
      documentName,
      ImageUrls,
      recipients,
      placeholders,
      signedDocument,
    } = doc;
    const recipientDetails = recipients.map((r) => {
      const randomAvatar =
        !r.avatar && avatars.length > 0
          ? avatars[Math.floor(Math.random() * avatars.length)].url
          : r.avatar;
      return {
        name: r.userName || r.email,
        email: r.email,
        updates: `${formatTimeAgo(new Date(r.statusTime))} `,
        recipientsAvatar: randomAvatar,
      };
    });

    const draftsList = user.drafts.map((draft) => ({
      name: draft.fileKey,
      url: draft.fileUrl,
      time: formatTimeAgo(new Date(draft.uploadedAt)),
    }));

    const recipientStatuses = recipients.map((r) => r.status);
    let status = "pending";

    if (!recipientStatuses || recipientStatuses.length === 0) {
      status = "draft";
    } else if (recipientStatuses.every((s) => s === "signed")) {
      status = "completed";
    } else if (recipientStatuses.includes("viewed")) {
      status = "viewed";
    }

    return {
      documentKey,
      title: documentName,
      documentUrl: ImageUrls,
      status,
      recipients: recipientDetails,
      signedDocument,
      placeholders: placeholders,
      drafts: draftsList,
    };
  });

  const incomingAgreements = user.incomingAgreements.map((agreement) => ({
    agreementKey: agreement.agreementKey,
    senderEmail: agreement.senderEmail,
    imageUrls: agreement.imageUrls,
    title: agreement.title,
    placeholders: agreement.placeholders,
    receivedAt: formatTimeAgo(new Date(agreement.receivedAt)),
    status: agreement.status,
  }));

  res.status(200).json({ recentDocuments: recentDocs, incomingAgreements });
});

exports.sendReminder = asyncHandler(async (req, res, next) => {
  const user = User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  try {
    const { emails, names, previewImageUrl, redirectUrl } = req.body;

    if (!Array.isArray(emails) || !Array.isArray(names)) {
      return res
        .status(400)
        .json({ message: "Emails and names must be provided as arrays" });
    }

    if (emails.length !== names.length) {
      return res
        .status(400)
        .json({ message: "Emails and names arrays must have the same length" });
    }

    const subject = "Reminder: Pending Document";

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      const userName = names[i] || "User";

      await sendEmail(
        email,
        subject,
        emailBody(
          user.name,
          user.avatar,
          user.email,
          previewImageUrl,
          redirectUrl,
          userName
        )
      );
    }

    res.status(200).json({ message: "Reminder sent successfully" });
  } catch (error) {
    next(error);
  }
});

exports.deleteDocument = asyncHandler(async (req, res, next) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: "Missing document key" });
  }

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  const docIndex = user.documentsSent.findIndex(
    (doc) => doc.documentKey === key
  );
  if (docIndex === -1) {
    return res.status(404).json({ error: "Document not found" });
  }
  const document = user.documentsSent[docIndex];

  const mainDeleteResult = await deleteObject(key);
  if (mainDeleteResult.status !== 204) {
    return res.status(500).json({
      error: "Failed to delete document file from S3",
      details: mainDeleteResult,
    });
  }

  const imagesPrefix = `images/${key}/`;
  try {
    const listParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Prefix: imagesPrefix,
    };
    const listCommand = new ListObjectsV2Command(listParams);
    const listResponse = await this.s3Client.send(listCommand);

    if (listResponse.Contents && listResponse.Contents.length > 0) {
      for (const file of listResponse.Contents) {
        const imageDeleteResult = await deleteObject(file.Key);
        if (imageDeleteResult.status !== 204) {
          console.error(
            `Failed to delete image ${file.Key}`,
            imageDeleteResult
          );
        }
      }
    }
  } catch (error) {
    console.error("Error deleting images from S3:", error);
    return res.status(500).json({ error: "Failed to delete images from S3" });
  }

  user.documentsSent.splice(docIndex, 1);
  await user.save();

  res.status(200).json({ message: "Document deleted successfully" });
});

exports.getCredits = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id)
    .select("credits")
    .select("+creditsHistory");

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.status(200).json({
    credits: user.credits,
    creditsHistory: user.creditsHistory,
  });
});

exports.ConvertToImages = asyncHandler(async (req, res, next) => {
  // Ensure the user exists.
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file provided" });
  }

  // Generate a unique ID for this process.
  const uniqueId = uuidv4();
  const originalName = file.originalname.trimStart();
  const fileKey = `agreements/${uniqueId}-${originalName}`;
  const imagesFolder = `images/${uniqueId}-${originalName}`;

  // Define the main temp directory.
  const tempDir = path.join(__dirname, "../temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create a dedicated subfolder using the unique id.
  const processDir = path.join(tempDir, uniqueId);
  if (!fs.existsSync(processDir)) {
    fs.mkdirSync(processDir, { recursive: true });
  }
  console.log(`Created process directory: ${processDir}`);

  let pdfBuffer;
  let docUrl;

  if (
    file.mimetype ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    // DOCX branch:
    // 1. Upload the DOCX file with a unique name.
    const docxUpload = await UploadDocx(file, `${uniqueId}-${originalName}`);
    // 2. Use the DOCX URL in the response.
    docUrl = docxUpload;
    // 3. Process the DOCX to get a PDF buffer (for image conversion only).
    pdfBuffer = await processFile(docxUpload, uniqueId);
  } else if (file.mimetype === "application/pdf") {
    // PDF branch:
    // Get the PDF buffer directly.
    pdfBuffer = file.buffer || fs.readFileSync(file.path);
  } else {
    return res.status(400).json({ error: "Unsupported file type" });
  }

  // Write the PDF buffer to a file in the dedicated subfolder.
  const tempFilePath = path.join(processDir, `${uniqueId}.pdf`);
  fs.writeFileSync(tempFilePath, pdfBuffer);

  // If the input file is a PDF, upload the PDF to S3.
  if (file.mimetype === "application/pdf") {
    const fileBuffer = fs.readFileSync(tempFilePath);
    const pdfUpload = await putObject(fileBuffer, fileKey, "application/pdf");
    if (pdfUpload.status !== 200) {
      throw new Error("Failed to upload document");
    }
    docUrl = pdfUpload.url;
  }

  // Set up options for the PDF-to-image conversion.
  const options = {
    jpegFile: true,
    resolutionXYAxis: 300,
    singleFile: false,
  };

  // Define an output prefix for Poppler conversion.
  // This prefix will be used to generate files like <uniqueId>-1.jpg, <uniqueId>-2.jpg, etc.
  const outputPrefix = path.join(processDir, uniqueId);

  await poppler.pdfToCairo(tempFilePath, outputPrefix, options);

  // List files in the process directory after conversion.
  const filesAfterConversion = fs.readdirSync(processDir);

  // Filter for image files (accepting both .jpg and .jpeg).
  const imageFiles = filesAfterConversion.filter((f) => {
    const lower = f.toLowerCase();
    return (
      (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) &&
      f.startsWith(uniqueId)
    );
  });

  let imageUrls = [];
  for (const imageFile of imageFiles) {
    const imagePath = path.join(processDir, imageFile);
    const imageBuffer = fs.readFileSync(imagePath);
    const imageKey = `${imagesFolder}/${imageFile}`;

    const imageUpload = await putObject(imageBuffer, imageKey, "image/jpeg");
    if (imageUpload.status !== 200) {
      throw new Error("Failed to upload image");
    }
    imageUrls.push(imageUpload.url);
    fs.unlinkSync(imagePath);
  }

  if (fs.existsSync(processDir)) {
    fs.rmSync(processDir, { recursive: true, force: true });
  }

  const date = new Date();
  const newDocument = {
    documentKey: fileKey,
    ImageUrls: imageUrls,
    documentName: originalName,
    sentAt: date,
  };

  // Also create a new draft object to push into user.drafts.
  const newDraft = {
    fileKey: fileKey,
    fileUrl: docUrl,
    uploadedAt: date,
  };

  // Update the user's documentsSent and drafts arrays.
  const updatedUser = await User.findByIdAndUpdate(
    req.user.id,
    {
      $push: {
        documentsSent: newDocument,
        drafts: newDraft,
      },
    },
    { new: true, runValidators: true }
  );
  console.log(updatedUser);

  res.status(200).json({
    message: "Converted successfully",
    fileKey,
    docUrl,
    imageUrls,
    previewImageUrl: imageUrls,
    originalName,
  });
});

exports.sendAgreements = asyncHandler(async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+creditsHistory");

    if (!user) {
      return res.status(401).json({ error: "Unauthorized user" });
    }
    if (user.subscriptionType === "free") {
      if (user.credits >= 10) {
        user.credits -= 10;
      } else {
        return res.status(403).json({
          error: "You do not have enough credits to send.",
        });
      }
    }

    // Ensure required fields are provided
    if (!req.body.emails || !req.body.names) {
      return res.status(400).json({ error: "Emails and names are required" });
    }

    const previewImageUrl = req.body.previewImageUrl;
    const fileKey = req.body.fileKey;
    const emails =
      typeof req.body.emails === "string"
        ? Object.values(JSON.parse(req.body.emails))
        : Object.values(req.body.emails);
    const names =
      typeof req.body.names === "string"
        ? Object.values(JSON.parse(req.body.names))
        : Object.values(req.body.names);
    let placeholders;
    try {
      placeholders =
        typeof req.body.placeholders === "string"
          ? JSON.parse(req.body.placeholders)
          : req.body.placeholders;
    } catch (error) {
      return res.status(400).json({ error: "Invalid placeholders format" });
    }

    const redirectUrl = `https://signbuddy.in?document=${encodeURIComponent(
      fileKey
    )}`;
    const subject = "Agreement Document for Signing";

    // Send out emails to all recipients.
    emails.forEach((email, index) => {
      sendEmail(
        email,
        subject,
        emailBody(
          user.userName,
          user.avatar,
          user.email,
          previewImageUrl,
          redirectUrl,
          names[index]
        )
      );
    });

    const date = new Date();

    // Build recipients info (used for updating sender's documentsSent).
    const recipients = await Promise.all(
      emails.map(async (email, index) => {
        const recipientUser = await User.findOne({ email });
        return {
          email,
          userName: names[index] || email,
          status: "pending",
          statusTime: date,
          avatar:
            recipientUser && recipientUser.avatar ? recipientUser.avatar : null,
        };
      })
    );
    const d = user.documentsSent.find((doc) => doc.documentKey === fileKey);

    // Update sender's document entry.
    const docIndex = user.documentsSent.findIndex(
      (doc) => doc.documentKey === fileKey
    );
    if (docIndex !== -1) {
      user.documentsSent[docIndex] = {
        ...user.documentsSent[docIndex],
        signedDocument: null,
        sentAt: date,
        recipients: recipients,
        placeholders: placeholders,
      };
    }

    // Deduct credits and update credits history.
    user.creditsHistory.push({
      thingUsed: "documentSent",
      creditsUsed: 10,
      timestamp: date,
    });

    // For each recipient, update their incoming agreements or create a record for non-registered users.
    for (let i = 0; i < emails.length; i++) {
      const recipientEmail = emails[i];
      const agreementData = {
        agreementKey: fileKey,
        senderEmail: user.email,
        imageUrls: d.ImageUrls || [], // or however you obtain the image URLs
        placeholders: placeholders,
        receivedAt: date,
        title: d && d.documentName ? d.documentName : "",
      };

      const recipientUser = await User.findOne({
        email: recipientEmail,
      }).select("incomingAgreements");
      if (recipientUser) {
        recipientUser.incomingAgreements.push(agreementData);
        await recipientUser.save();
      } else {
        // If the recipient does not have an account, update or create a record in SendUsersWithNoAccount.
        let noAccountRecord = await SendUsersWithNoAccount.findOne({
          email: recipientEmail,
        });
        if (!noAccountRecord) {
          noAccountRecord = new SendUsersWithNoAccount({
            email: recipientEmail,
            incomingAgreements: [agreementData],
          });
        } else {
          noAccountRecord.incomingAgreements.push(agreementData);
        }
        await noAccountRecord.save();
      }
    }
    if (user.drafts && user.drafts.length) {
      user.drafts = user.drafts.filter((draft) => draft.fileKey !== fileKey);
    }
    await user.save();

    res.status(200).json({
      message: "Agreement sent successfully",
      previewImageUrl,
      fileKey,
      allImageUrls: d.ImageUrls,
    });
  } catch (error) {
    console.error("Error sending agreement:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  const keysToDelete = [];
  if (user.drafts && Array.isArray(user.drafts)) {
    user.drafts.forEach((draft) => {
      if (draft.fileKey) {
        keysToDelete.push({ Key: draft.fileKey });
      }
    });
  }
  if (user.templates && Array.isArray(user.templates)) {
    user.templates.forEach((template) => {
      if (template.fileKey) {
        keysToDelete.push({ Key: template.fileKey });
      }
    });
  }

  if (user.documentsSent && Array.isArray(user.documentsSent)) {
    for (const doc of user.documentsSent) {
      if (doc.documentKey) {
        keysToDelete.push({ Key: doc.documentKey });
      }
      if (doc.ImageUrls && Array.isArray(doc.ImageUrls)) {
        doc.ImageUrls.forEach((imageKey) => {
          keysToDelete.push({ Key: imageKey });
        });
      }
      if (doc.documentKey) {
        const prefix = `images/${doc.documentKey}/`;
        const listParams = {
          Bucket: process.env.AWS_S3_BUCKET, // Your S3 bucket name
          Prefix: prefix,
        };
        try {
          const listCommand = new ListObjectsV2Command(listParams);
          const listResponse = await s3Client.send(listCommand);
          if (listResponse.Contents && listResponse.Contents.length > 0) {
            listResponse.Contents.forEach((item) => {
              keysToDelete.push({ Key: item.Key });
            });
          }
        } catch (error) {
          console.error(`Error listing objects for prefix ${prefix}:`, error);
        }
      }
    }
  }

  if (keysToDelete.length > 0) {
    const deleteParams = {
      Bucket: process.env.AWS_S3_BUCKET,
      Delete: {
        Objects: keysToDelete,
        Quiet: false,
      },
    };

    try {
      const deleteCommand = new DeleteObjectsCommand(deleteParams);
      const deleteResponse = await s3Client.send(deleteCommand);
      console.log("S3 deletion response:", deleteResponse);
    } catch (error) {
      console.error("Error deleting S3 objects:", error);
    }
  }
  await DeletedAccounts.create({
    email: user.email,
    credits: user.credits,
  });

  await User.findByIdAndDelete(userId);
  res
    .status(200)
    .json({ message: "User and associated files deleted successfully" });
});

exports.updateProfileDetails = asyncHandler(async (req, res, next) => {
  const userId = req.user.id;
  const { username, email, avatar } = req.body;

  if (!username && !email && !avatar) {
    return res.status(400).json({
      error:
        "At least one field (username, email, or avatar) must be provided to update.",
    });
  }

  const updateData = {};
  if (username) updateData.userName = username;
  if (avatar) updateData.avatar = avatar;

  let updatedUser = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  });

  if (email) {
    const user = await User.findById(userId);
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    user.hashedOtp = hashedOtp;
    user.hashedOtpExpire = Date.now() + 10 * 60 * 1000;

    await user.save();
    const body = VerifyEmailTemplate(otp, user.userName);

    sendEmail(email, "Verify your new email", body);
    if (!username && !avatar) {
      return res.status(200).json({
        message: "Sent Otp to email.",
      });
    }
  }
  res.status(200).json({
    message: "Profile updated successfully.",
    user: updatedUser,
  });
});
exports.verifyEmailUpdate = asyncHandler(async (req, res, next) => {
  const { otp, email, newEmail } = req.body;
  if (!otp) {
    return res.status(400).json({ error: "OTP is required." });
  }
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }
  if (!user.hashedOtp) {
    return res.status(400).json({ error: "Signup successfull." });
  }

  // Insert expiry check here using your method
  if (user.CheckExpiryOfOtp()) {
    user.hashedOtp = null;
    user.hashedOtpExpire = null;
    user.save();
    return res
      .status(400)
      .json({ error: "OTP has expired. Please request a new OTP." });
  }

  const isMatch = await bcrypt.compare(otp, user.hashedOtp);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  user.email = newEmail;
  user.hashedOtp = null;
  user.hashedOtpExpire = null;
  await user.save();
  res.status(200).json({
    message: "Email updated successfully.",
    user,
  });
});

// forgot password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const email = req.body.email;
  const user = await User.findOne({ email });
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }
  const otp = Math.floor(1000 + Math.random() * 9000).toString();
  const hashedOtp = await bcrypt.hash(otp, 10);
  user.hashedOtp = hashedOtp;
  user.hashedOtpExpire = Date.now() + 10 * 60 * 1000;
  await user.save();
  const body = VerifyEmailTemplate(otp, user.userName);
  sendEmail(email, "Forgot passowrd", body);
  return res.status(201).json({ message: "OTP Sent successfully" });
});

// reset password
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { otp, newPassword, email } = req.body;
  const user = await User.findOne({ email }).select("+password");
  if (!user) {
    next(new errorHandler("user dosent exit", 401));
  }
  if (!user.hashedOtpExpire || Date.now() > user.hashedOtpExpire) {
    user.hashedOtp = null;
    user.hashedOtpExpire = null;
    await user.save();
    return res
      .status(400)
      .json({ error: "OTP has expired. Please request a new OTP." });
  }

  const isMatch = await bcrypt.compare(otp, user.hashedOtp);
  if (!isMatch) {
    return res.status(400).json({ error: "Invalid OTP." });
  }

  user.password = newPassword;
  user.hashedOtp = null;
  user.hashedOtpExpire = null;
  await user.save();
  res.status(200).json({
    message: "Pasword updated successfully.",
    user,
  });
});
