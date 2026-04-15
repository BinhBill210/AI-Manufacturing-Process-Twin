const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/anchorlist/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const anchors = await pool.query(
      `SELECT * FROM anchors WHERE networkid = $1`,
      [networkID]
    );
    return res.json(anchors.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/taglist/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const tags = await pool.query(
      `SELECT * FROM tags WHERE networkid = $1 ORDER BY tagid ASC`,
      [networkID]
    );
    return res.json(tags.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/taglocations/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;

    const location = await pool.query(
      `
      SELECT
        t1.tagid,
        t1.x,
        t1.y,
        t1.z,
        t2.name,
        t2.object_size
      FROM location t1
      JOIN (
        SELECT l.tagid, MAX(l.time) AS max_timestamp
        FROM location l
        JOIN tags tg ON tg.tagid = l.tagid
        WHERE tg.networkid = $1
        GROUP BY l.tagid
      ) t3
        ON t1.tagid = t3.tagid
       AND t1.time = t3.max_timestamp
      LEFT JOIN tags t2
        ON t1.tagid = t2.tagid
      WHERE t2.networkid = $1
      `,
      [networkID]
    );

    return res.json(location.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/tag-accuracy/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const tagAccuracy = await pool.query(
      `
      SELECT
        l.tagid,
        ROUND(AVG(l.quality), 0) AS accuracy
      FROM location l
      JOIN tags t ON t.tagid = l.tagid
      WHERE t.networkid = $1
      GROUP BY l.tagid
      `,
      [networkID]
    );

    const tagAccuracyDict = {};
    for (let i = 0; i < tagAccuracy.rows.length; i++) {
      tagAccuracyDict[tagAccuracy.rows[i].tagid] = tagAccuracy.rows[i].accuracy;
    }

    return res.json(tagAccuracyDict);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/tag-history/:tagID/:timeframe", async (req, res) => {
  try {
    const { tagID, timeframe } = req.params;
    let interval = "1 WEEK";

    if (timeframe === "hour") interval = "1 HOUR";
    else if (timeframe === "day") interval = "1 DAY";

    const tagLocations = await pool.query(
      `
      SELECT tagid, x, y, z
      FROM location
      WHERE time >= NOW() - $1::interval
        AND tagid = $2
      ORDER BY time ASC
      `,
      [interval, tagID]
    );

    return res.json(tagLocations.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/tag-history-range/:tagID/:startTime/:endTime", async (req, res) => {
  try {
    const { tagID, startTime, endTime } = req.params;
    const tagLocations = await pool.query(
      `
      SELECT tagid, x, y, z
      FROM location
      WHERE time BETWEEN $1 AND $2
        AND tagid = $3
      ORDER BY time ASC
      `,
      [startTime, endTime, tagID]
    );

    return res.json(tagLocations.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

router.put("/update-tag", async (req, res) => {
  try {
    const { tagid, name, size } = req.body;

    await pool.query(
      `UPDATE tags SET name = $1, object_size = $2 WHERE tagid = $3`,
      [name, size, tagid]
    );

    return res.status(200).send("Tag updated successfully");
  } catch (error) {
    console.error("Error updating tag:", error.message);
    return res.status(500).send("Server error");
  }
});

module.exports = router;