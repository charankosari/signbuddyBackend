exports.finalHtml = (data, pageWidthMM, pageHeightMM) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>SignBuddy - Final Page</title>
  <!-- Font Awesome (optional) -->
  <link
    rel="stylesheet"
    href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.2.1/css/all.min.css"
    integrity="sha512-qo3RDXG2sL8s8RZPy1fSGMQ9q4/n0Sm6T0LeDY3YTv1V/sojkBpQcB1eF57a0A6w9u+Vpz/+4ZviExD2c9fQNg=="
    crossorigin="anonymous"
    referrerpolicy="no-referrer"
  />
  <style>
    /* Basic reset and font styling */
   * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: 100%;
      height: 100%;
      background: #fff;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen,
        Ubuntu, Cantarell, sans-serif;
      color: #333;
      font-size: 14px;
    }
    /* 
      Use flex layout to stretch content and push footer to bottom.
      Keep the specified width & height in mm to match your PDF dimensions.
    */
    .a4-container {
      width: ${pageWidthMM}mm;
      height: ${pageHeightMM}mm;
      margin: 0 auto;
      background: #fff;
      display: flex;
      flex-direction: column;
      justify-content: space-between; /* Header at top, footer at bottom */
      padding: 20px;
      overflow: hidden; /* Clipping if anything overflows */
    }

    h1 {
      font-size: 22px;
      margin-bottom: 6px;
      font-weight: 600;
      color: #444;
    }
    .gray-text {
      color: #777;
      margin-right: 5px;
      font-weight: 500;
    }
    a {
      color: #0066cc;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }

    /* Basic info table at the top */
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    .info-table td {
      padding: 4px 0;
      vertical-align: top;
    }

    /* Section title for the “Complete Audit Record” heading */
    .section-title {
      font-size: 16px;
      color: #333;
      font-weight: 600;
      margin-bottom: 12px;
    }

    /* Table for listing created/sent/viewed/signed events */
    .audit-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    .audit-table tr {
      border-bottom: 1px solid #eee;
    }
    .audit-table td {
      padding: 12px 0;
    }

    /* Layout for each event row */
    .audit-entry {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .top-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
    }
    .left-block {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .icon {
      font-size: 18px;
      color: #666;
    }
    .participant-name {
      font-weight: 600;
      color: #555;
    }
    .action-text {
      color: #666;
    }
    .time-text {
      color: #333;
      font-weight: 500;
      white-space: nowrap;
    }
    .ip-line {
      font-size: 12px;
      color: #999;
    }
  </style>
</head>
<body>
  <div class="a4-container">
    <h1>SignBuddy</h1>
    <p>
      Document is verified &amp; completed with
      <a href="https://signbuddy.in" target="_blank">signbuddy.in</a>
    </p>

    <!-- Info Table -->
    <table class="info-table">
      <tr>
        <td><span class="gray-text">Document Name:</span> ${
          data.documentName
        }</td>
      </tr>
      <tr>
        <td><span class="gray-text">Document ID:</span> ${data.documentId}</td>
      </tr>
      <tr>
        <td><span class="gray-text">Document Creation Time:</span> ${
          data.creationTime
        }</td>
      </tr>
      <tr>
        <td><span class="gray-text">Document Creation IP:</span> ${
          data.creationIp
        }</td>
      </tr>
      <tr>
        <td><span class="gray-text">Completed At:</span> ${
          data.completedTime
        }</td>
      </tr>
    </table>

    <div class="section-title">Complete Audit Record</div>

    <table class="audit-table">
      <!-- "Created" row -->
      <tr>
        <td>
          <div class="audit-entry">
            <div class="top-line">
              <div class="left-block">
                <i class="fa-solid fa-user icon"></i>
                <span class="participant-name">${
                  data.createdRow.senderName
                }</span>
                <span class="action-text">
                  Created the document (${data.createdRow.senderEmail})
                </span>
              </div>
              <span class="time-text">${data.createdRow.time}</span>
            </div>
            <div class="ip-line">IP - ${data.createdRow.ip}</div>
          </div>
        </td>
      </tr>

      <!-- Example "Sent" rows -->
      ${data.sentRows
        .map(
          (row) => `
      <tr>
        <td>
          <div class="audit-entry">
            <div class="top-line">
              <div class="left-block">
                <i class="fa-solid fa-paper-plane icon"></i>
                <span class="participant-name">${row.recipientName}</span>
                <span class="action-text">Document sent to ${row.recipientEmail}</span>
              </div>
              <span class="time-text">${row.time}</span>
            </div>
            <div class="ip-line">IP - ${row.ip}</div>
          </div>
        </td>
      </tr>
      `
        )
        .join("")}

      <!-- Example "Viewed" rows -->
      ${data.viewedRows
        .map(
          (row) => `
      <tr>
        <td>
          <div class="audit-entry">
            <div class="top-line">
              <div class="left-block">
                <i class="fa-solid fa-eye icon"></i>
                <span class="participant-name">${row.recipientName}</span>
                <span class="action-text">Document viewed by ${row.recipientEmail}</span>
              </div>
              <span class="time-text">${row.time}</span>
            </div>
            <div class="ip-line">IP - ${row.ip}</div>
          </div>
        </td>
      </tr>
      `
        )
        .join("")}

      <!-- Example "Signed" rows -->
      ${data.signedRows
        .map(
          (row) => `
      <tr>
        <td>
          <div class="audit-entry">
            <div class="top-line">
              <div class="left-block">
                <i class="fa-solid fa-pen icon"></i>
                <span class="participant-name">${row.recipientName}</span>
                <span class="action-text">Signed the document ${row.recipientEmail}</span>
              </div>
              <span class="time-text">${row.time}</span>
            </div>
            <div class="ip-line">IP - ${row.ip}</div>
          </div>
        </td>
      </tr>
      `
        )
        .join("")}
    </table>

    <div class="footer">
      <span>Document ID: ${data.documentId}</span>
      <span>Verified by SignBuddy</span>
    </div>
  </div>
</body>
</html>
`;
};
exports.signUpOtpMail = (otp) => {
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
exports.VerifyEmailTemplate = (otp, name) => {
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
exports.emailForPreuser = `<!DOCTYPE html>
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
exports.emailBody = (
  senderName,
  avatar,
  senderEmail,
  previewImageUrl,
  redirectUrl,
  name,
  emailB
) => {
  const instructions = !emailB
    ? `
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
      `
    : "";
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

        ${instructions}
  
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

exports.ViewedDocument = (
  senderImage,
  senderName,
  senderEmail,
  userName,
  documentName
) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{Document Name} has been viewed by {Recipient Name}</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: Arial, sans-serif;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="background-color: #111111; margin: 0; padding: 0"
    >
      <tr>
        <td>
          <!-- Header -->
          <div style="max-width: 600px; margin: 0 auto">
            <p
              style="
                color: #dadadb;
                margin-bottom: 4px;
                font-size: 24px;
                text-align: left;
                font-weight: 600;
              "
            >
              SignBuddy
            </p>
            <p
              style="
                color: #dadadb;
                margin: 0px;
                font-size: 14px;
                color: #7a7a81;
                text-align: left;
              "
            >
              The Document Signing made easier than ever.
            </p>
          </div>

          <!-- Main Content Card -->
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              max-width: 600px;
              margin: 28px auto 0;
              border-radius: 8px;
              padding: 0px 8px;
              background-color: #111111;
              border: 1px solid #404040;
            "
          >
            <tr>
              <td style="padding: 20px">
                <!-- Profile Section -->
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td>
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right: 8px">
                            <img
                              src=${senderImage}
                              alt="Profile"
                              style="
                                width: 48px;
                                height: 48px;
                                border-radius: 50%;
                              "
                            />
                          </td>
                          <td>
                            <p
                              style="
                                margin: 0 0 4px;
                                font-size: 16px;
                                color: #ffffff;
                                font-weight: 500;
                              "
                            >
                              ${senderName}
                            </p>
                            <p
                              style="margin: 0; font-size: 13px; color: #7a7a81"
                            >
                              ${senderEmail}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>

                <!-- Message Content -->
                <div style="margin-top: 20px">
                  <p style="margin: 0 0 10px; font-size: 14px; color: #7a7a81">
                    Hey there ${senderName},
                  </p>
                  <p
                    style="
                      margin: 0 0 10px;
                      font-size: 14px;
                      line-height: 1.8;
                      color: #dadadb;
                    "
                  >
                    <strong>${documentName}</strong> has been viewed by the <strong>${userName}</strong>
                    
                  </p>
                  <p style="margin: 0 0 4px; font-size: 14px; color: #dadadb">
                    Thank you,
                  </p>
                  <p style="margin: 0; font-size: 14px; color: #dadadb">
                    - SignBuddy
                  </p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Footer -->
          <div style="max-width: 600px; margin: 32px auto 0">
            <!-- Footer Links -->
            <table
              width="100%"
              cellpadding="0"
              cellspacing="0"
              role="presentation"
              style="margin-top: 12px; border-top: 1px solid #333"
            >
              <tr>
                <td style="padding-top: 12px">
                  <table
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    role="presentation"
                  >
                    <tr>
                      <td style="color: #666666; font-size: 10px">
                        Copyright © 2025 SignBuddy. All Rights Reserved.
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
              <!-- Social Media Icons -->
              <tr>
                <td style="padding-top: 8px">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <a
                          href="YOUR_LINKEDIN_URL"
                          style="text-decoration: none; margin-right: 16px"
                        >
                          <img
                            src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/linkedin.png"
                            alt="LinkedIn"
                            style="width: 28px; height: 28px"
                          />
                        </a>
                        <a
                          href="YOUR_INSTAGRAM_URL"
                          style="text-decoration: none; margin-right: 16px"
                        >
                          <img
                            src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/instagram.png"
                            alt="Instagram"
                            style="width: 28px; height: 28px"
                          />
                        </a>
                        <a
                          href="YOUR_TWITTER_URL"
                          style="text-decoration: none"
                        >
                          <img
                            src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/twitter.png"
                            alt="Twitter"
                            style="width: 28px; height: 28px"
                          />
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top: 12px">
                  <p
                    style="
                      color: #666666;
                      font-size: 12px;
                      margin: 0 0 24px;
                      text-align: center;
                    "
                  >
                    <img
                      src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/star.png"
                      style="width: 14px; height: 14px; margin-right: 4px"
                    />
                    Powered by <strong>Syncore Labs</strong>
                  </p>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
};

exports.sendDocument = (
  documentName,
  senderImage,
  senderName,
  senderEmail,
  customBody,
  documentPriview,
  documentUrl
) => {
  return `
  <!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Please complete the ${documentName}</title>
  </head>
  <body
    style="
      margin: 0;
      padding: 0;
      background-color: #09090b;
      font-family: Arial, sans-serif;
    "
  >
    <table
      width="100%"
      cellpadding="0"
      cellspacing="0"
      role="presentation"
      style="background-color: #111111; margin: 0; padding: 0"
    >
    <tr>
      <td>
        <div style="max-width: 600px; margin: 0 auto;">
          <p style="color: #dadadb; margin-bottom:4px; font-size:24px; text-align:left; font-weight:600;">SignBuddy</p>
          <p style="color: #dadadb; margin:0px; font-size:14px; color:#7a7a81;text-align:left;">The Document Signing made easier than ever.</p>
        </div>
      </td>
    </tr>
      <tr>
        <td align="center" style="padding: 0px">
          <table
            width="100%"
            cellpadding="0"
            cellspacing="0"
            role="presentation"
            style="
              max-width: 600px;
              margin: 28px auto 0;
              border-radius: 8px;
              padding: 0px 20px;
              background-color: #111111;
              border:1px solid #404040;
            "
          >
            <!-- Header with Profile -->
            <tr>
              <td style="padding: 20px 0">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: middle">
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-right: 15px">
                            <img
                              src=${senderImage}
                              alt="Profile"
                              style="
                                width: 48px;
                                height: 48px;
                                border-radius: 50%;
                              "
                            />
                          </td>
                          <td>
                            <p
                               style="
                                margin: 0 0 5px;
                                font-size: 16px;
                                color: #dadadb;
                                font-weight: 500;
                              "
                            >
                             ${senderName}
                            </p>
                            <p
                              style="margin: 0; font-size: 13px; color: #7a7a81"
                            >
                            ${senderEmail}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <!-- Message Content -->
            <tr>
              <td style="padding: 0 0 30px">
                <p style="margin: 0 0 12px; font-size: 14px; color: #7a7a81">
                ${customBody}
                </p>
              </td>
            </tr>

            <!-- Document Preview Text -->
            <tr>
              <td style="padding: 0 0 20px">
                <p style="margin: 0; font-size: 14px; color: #dadadb">
                  Please click the button below to complete the document.
                </p>
              </td>
            </tr>

            <!-- Document Preview Images -->
            <tr>
              <td>
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 0 5px; text-align: center">
                      <img
                        src=${documentPriview}
                        alt="Document Preview 1"
                        style="width: 100%; max-width: 180px; max-height: 290px"
                      />
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Complete Document Button -->
            <tr>
              <td align="center" style="padding: 20px 0 30px">
                <table cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="background-color: #dadadb; border-radius: 4px">
                      <a
                        href=${documentUrl}
                        style="
                          display: inline-block;
                          padding: 10px 20px;
                          color: #000000;
                          text-decoration: none;
                          font-size: 14px;
                          font-weight: 500;
                        "
                        >Complete the document</a
                      >
                    </td>
                  </tr>
                </table>
                <!-- Description -->
        </td>
      </tr>
    </table>
    <div style="max-width: 600px;">
      <p
      style="
                    color: #666666;
                    margin: 20px 0 0;
                    font-size: 12px;
                    line-height: 1.5;
                    text-align: left;
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
                  alternative to other costly softwares out there. Sign documents
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
                 style="margin-top: 12px; border-top: 1px solid #333"
               >
                 <tr>
                   <td style="padding-top: 12px">
                     <table
                       width="100%"
                       cellpadding="0"
                       cellspacing="0"
                       role="presentation"
                     >
                       <tr>
                         <td style="color: #666666; font-size: 10px">
                           Copyright © 2025 SignBuddy. All Rights Reserved.
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
                     <!-- Social Media Icons -->
              <tr>
                <td style="padding-top: 8px">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td>
                        <a
                          href="YOUR_LINKEDIN_URL"
                          style="text-decoration: none; margin-right: 16px"
                        >
                          <img
                          src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/linkedin.png"
                            alt="LinkedIn"
                            style="width: 28px; height: 28px"
                          />
                        </a>
                        <a
                        href="YOUR_INSTAGRAM_URL"
                        style="text-decoration: none; margin-right: 16px"
                      >
                        <img
                          src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/instagram.png"
                          alt="Instagram"
                          style="width: 28px; height: 28px"
                        />
                      </a>
                      <a
                        href="YOUR_TWITTER_URL"
                        style="text-decoration: none"
                      >
                        <img
                          src="https://signbuddy.s3.ap-south-1.amazonaws.com/utilImages/twitter.png"
                          alt="Twitter"
                          style="width: 28px; height: 28px"
                        />
                      </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top: 12px">
                  <p
                    style="
                      color: #666666;
                      font-size: 12px;
                      margin: 0 0 24px;
                      text-align: center;
                    "
                  >
                    <img
                      src="star.png"
                      style="width: 14px; height: 14px; margin-right: 4px"
                    />
                    Powered by <strong>Syncore Labs</strong>
                  </p>
                </td>
              </tr>
              </td>
            </tr>
          </table>
    </div>
  </body>
</html>
`;
};
