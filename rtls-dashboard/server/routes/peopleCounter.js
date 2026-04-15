const express = require("express");
const router = express.Router();
const pool = require("../db");

router.get("/people-counter/entrance/factory", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(`SET TIME ZONE '+11:00'`);

    const entranceEvents = await client.query(`
      SELECT *
      FROM events
      WHERE action = 'Entrance'
        AND area = 'CP Factory'
        AND DATE(datetime) = DATE(CURRENT_TIMESTAMP)
        AND EXTRACT(HOUR FROM datetime) >= 5
    `);

    return res.json(entranceEvents.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    try {
      await client.query(`SET TIME ZONE 'UTC'`);
    } catch (_) {}
    client.release();
  }
});

router.get("/people-counter/entrance/manufactoring", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(`SET TIME ZONE '+11:00'`);

    const entranceEvents = await client.query(`
      SELECT *
      FROM events
      WHERE action = 'Entrance'
        AND area = 'Advanced Manufactoring'
        AND DATE(datetime) = DATE(CURRENT_TIMESTAMP)
        AND EXTRACT(HOUR FROM datetime) >= 5
    `);

    return res.json(entranceEvents.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    try {
      await client.query(`SET TIME ZONE 'UTC'`);
    } catch (_) {}
    client.release();
  }
});

router.get("/people-counter/exit/factory", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(`SET TIME ZONE '+11:00'`);

    const exitEvents = await client.query(`
      SELECT *
      FROM events
      WHERE action = 'Exit'
        AND area = 'CP Factory'
        AND DATE(datetime) = DATE(CURRENT_TIMESTAMP)
        AND EXTRACT(HOUR FROM datetime) >= 5
    `);

    return res.json(exitEvents.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    try {
      await client.query(`SET TIME ZONE 'UTC'`);
    } catch (_) {}
    client.release();
  }
});

router.get("/people-counter/exit/manufactoring", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query(`SET TIME ZONE '+11:00'`);

    const exitEvents = await client.query(`
      SELECT *
      FROM events
      WHERE action = 'Exit'
        AND area = 'Advanced Manufactoring'
        AND DATE(datetime) = DATE(CURRENT_TIMESTAMP)
        AND EXTRACT(HOUR FROM datetime) >= 5
    `);

    return res.json(exitEvents.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  } finally {
    try {
      await client.query(`SET TIME ZONE 'UTC'`);
    } catch (_) {}
    client.release();
  }
});

module.exports = router;