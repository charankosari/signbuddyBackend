const express = require("express");
const app = express();
const user = require("./routes/userRouter");
const payments = require("./routes/paymentRoutes");
const errorMiddleware = require("./middleware/error");
const cookieParser = require("cookie-parser");
const logger = require("morgan");
const cors = require("cors");

// cors
// app.use(cors())
app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());
app.use(logger("tiny"));
app.use(express.json());

app.use("/api/v1/payments", payments);
app.use("/api/v1", user);
app.use(errorMiddleware);

module.exports = app;
