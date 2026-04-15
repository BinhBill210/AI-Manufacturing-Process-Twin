const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/topbar-network-list", async (req, res) => {
  try {
    const networks = await pool.query(
      `SELECT networkid, name FROM networks ORDER BY name ASC`
    );
    return res.json(networks.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/networklist", async (req, res) => {
  try {
    const networks = await pool.query(`
      SELECT
        networks.*,
        (SELECT COUNT(*) FROM anchors WHERE anchors.networkid = networks.networkid) AS anchor_count,
        (SELECT COUNT(*) FROM tags WHERE tags.networkid = networks.networkid) AS tag_count
      FROM networks
    `);
    return res.json(networks.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/anchor-locations/:networkID", async (req, res) => {
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

router.get("/network-info/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const networkInfo = await pool.query(
      `SELECT * FROM networks WHERE networkid = $1`,
      [networkID]
    );
    return res.json(networkInfo.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/network-segments/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const networkSegments = await pool.query(
      `SELECT * FROM network_segments WHERE networkid = $1`,
      [networkID]
    );
    return res.json(networkSegments.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/network-zones/:networkID", async (req, res) => {
  try {
    const { networkID } = req.params;
    const networkZones = await pool.query(
      `SELECT * FROM zones WHERE networkid = $1`,
      [networkID]
    );
    return res.json(networkZones.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

router.delete("/network-segment/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM network_segments WHERE id = $1`, [id]);
    return res.status(200).send("Segment deleted successfully");
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server error");
  }
});

router.post("/add-network-segment", async (req, res) => {
  try {
    const { networkID, name, x, y, width, height } = req.body;
    await pool.query(
      `INSERT INTO network_segments (networkid, name, segment_x, segment_y, width, height)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [networkID, name, x, y, width, height]
    );
    return res.status(200).send("Segment added successfully");
  } catch (error) {
    console.error(error.message);
    return res.status(500).send("Server error");
  }
});

router.post("/add-network-zone", async (req, res) => {
  try {
    const { networkID, tagID, type, name, x, y, width, height } = req.body;
    const zoneType = type === "inclusion";

    await pool.query(
      `INSERT INTO zones (networkid, tagid, name, x, y, width, height, inclusion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [networkID, tagID, name, x, y, width, height, zoneType]
    );

    return res.status(200).send("Zone added successfully");
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

router.put("/update-network-info/:networkID/:name/:filename/:x/:y", async (req, res) => {
  try {
    const { networkID, name, filename, x, y } = req.params;

    await pool.query(
      `UPDATE networks
       SET networkid = $1, name = $2, floorplan_filename = $3, floorplan_width = $4, floorplan_height = $5
       WHERE networkid = $1`,
      [networkID, name, filename, x, y]
    );

    return res.status(200).send("Network updated successfully");
  } catch (err) {
    console.error(err.message);
    return res.status(500).send("Server error");
  }
});

module.exports = router;