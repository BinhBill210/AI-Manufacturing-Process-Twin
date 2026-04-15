const express = require("express");
const router = express.Router();
const pool = require("../db");

router.post("/add-obstacle", async (req, res) => {
  try {
    const { tagId, networkID, name, x, y, width, height } = req.body;

    await pool.query(
      `
      INSERT INTO public.obstacles (networkid, tagid, name, x, y, width, height)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [networkID, tagId, name, x, y, width, height]
    );

    return res.status(200).send("Obstacle added successfully");
  } catch (error) {
    console.error("Server error:", error.message);
    return res.status(500).send("Server error");
  }
});

router.get("/get-obstacle", async (req, res) => {
  try {
    const response = await pool.query(`SELECT * FROM public.obstacles`);
    return res.json(response.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/obstacle-segment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM obstacles WHERE obstacleid = $1`, [id]);
    return res.status(200).send("obstacle deleted successfully");
  } catch (error) {
    console.error("Error deleting segment:", error.message);
    return res.status(500).send("Server error");
  }
});

module.exports = router;