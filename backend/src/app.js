
const express = require("express");
const authRoutes = require("./routes/auth.route");
const requestRoutes = require("./routes/request.routes");
const { errorHandler, notFound } = require("./middleware/errorHandler");

const app = express();
const cors = require("cors");
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/", requestRoutes);


app.use(notFound);
app.use(errorHandler);

module.exports = app;