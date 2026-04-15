const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/tag-history-range/:x/:y/:z/:collisiontime/:tag", async (req, res) => {
  try {
    const { collisiontime, tag } = req.params;

    const collisions = await pool.query(
      `
      WITH PreviousRows AS (
        SELECT id
        FROM public.location
        WHERE tagid = $1
          AND time <= $2
        ORDER BY time DESC
        LIMIT 1
      )
      SELECT *
      FROM public.location
      WHERE id < (SELECT id FROM PreviousRows)
        AND tagid = $1
      ORDER BY id DESC
      LIMIT 7
      `,
      [tag, collisiontime]
    );

    return res.json(collisions.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

router.get("/collision-history-range/:startTime/:endTime", async (req, res) => {
  try {
    const { startTime, endTime } = req.params;

    const collisions = await pool.query(
      `
      SELECT *
      FROM collisions
      WHERE collisiontime BETWEEN $1 AND $2
      ORDER BY collisiontime DESC
      LIMIT 5
      `,
      [startTime, endTime]
    );

    return res.json(collisions.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

router.post("/collisionlocation", async (req, res) => {
  try {
    const { tag1, tag2, x, y, z } = req.body;

    await pool.query(
      `
      INSERT INTO collisions(tag1, tag2, x, y, z)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [tag1, tag2, x, y, z]
    );

    return res.status(200).send("Location added successfully");
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

router.get("/getCollisionlocations", async (req, res) => {
  try {
    const collisions = await pool.query(`SELECT * FROM collisions`);
    return res.json(collisions.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/collisions-heatmap", async (req, res) => {
  try {
    const query = `
      WITH hours AS (
        SELECT generate_series(9, 16) AS hour
      ),
      days AS (
        SELECT generate_series(1, 5) AS dow
      )
      SELECT
        days.dow,
        hours.hour,
        COALESCE(COUNT(collisiontime), 0) AS total_collisions
      FROM days
      CROSS JOIN hours
      LEFT JOIN collisions
        ON EXTRACT(DOW FROM collisions.collisiontime) = days.dow
       AND DATE_PART('hour', collisions.collisiontime) = hours.hour
      GROUP BY days.dow, hours.hour
      ORDER BY days.dow, hours.hour
    `;

    const collisions = await pool.query(query);
    return res.json(collisions.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;