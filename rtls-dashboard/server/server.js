const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const express = require("express");
const cors = require("cors");

const networksRoutes = require("./routes/networks");
const tagsRoutes = require("./routes/tags");
const notificationsRoutes = require("./routes/notifications");
const peopleCounterRoutes = require("./routes/peopleCounter");
const analyticsRoutes = require("./routes/analytics");
const collisionsRoutes = require("./routes/collisions");
const obstaclesRoutes = require("./routes/obstacles");

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.use("/api", networksRoutes);
app.use("/api", tagsRoutes);
app.use("/api", notificationsRoutes);
app.use("/api", peopleCounterRoutes);
app.use("/api", analyticsRoutes);
app.use("/api", collisionsRoutes);
app.use("/api", obstaclesRoutes);

app.listen(port, "0.0.0.0", () => {
  console.log(`Server started on port ${port}`);
});

