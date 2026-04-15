const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/notification-list/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const notificationList = await pool.query(
      `SELECT * FROM notifications WHERE networkid = $1`,
      [networkID]
    );
    return res.json(notificationList.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/create-notification", async (req, res) => {
  try {
    const { networkID, name, description, type } = req.body;

    await pool.query(
      `
      INSERT INTO notifications (networkID, name, description, type)
      VALUES ($1, $2, $3, $4)
      `,
      [networkID, name, description, type]
    );

    return res.status(201).json({ message: "Notification created successfully" });
  } catch (err) {
    console.error("Error creating notification:", err.message);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/delete-notification/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM notifications WHERE id = $1`, [id]);
    return res.status(200).send("Notification deleted successfully");
  } catch (error) {
    console.error("Error deleting notification:", error.message);
    return res.status(500).send("Server error");
  }
});

module.exports = router;