const express = require("express");
const router = express.Router();
const { spawn } = require("child_process");
const path = require("path");

const PYTHON_BIN =
  process.env.PYTHON_BIN ||
  path.join(__dirname, "..", "..", ".rtls-venv", "bin", "python");

const PYTHON_SCRIPT = path.join(
  __dirname,
  "..",
  "..",
  "projects",
  "station_boundaries.py"
);

const DWELL_SCRIPT = path.join(
  __dirname,
  "..",
  "..",
  "projects",
  "dwell_time.py"
);

const PROCESS_SCRIPT = path.join(
  __dirname,
  "..",
  "..",
  "projects",
  "process_analytics.py"
);

router.post("/station-boundaries", (req, res) => {
  const { startTime, endTime, timeframe, tagIDs } = req.body;

  if (!Array.isArray(tagIDs) || tagIDs.length === 0) {
    return res.status(400).json({ error: "tagIDs array is required" });
  }

  let start = startTime;
  let end = endTime;

  if ((!start || !end) && timeframe) {
    const now = new Date();
    let msBack = 0;

    if (timeframe === "hour") msBack = 60 * 60 * 1000;
    else if (timeframe === "day") msBack = 24 * 60 * 60 * 1000;
    else if (timeframe === "week") msBack = 7 * 24 * 60 * 60 * 1000;

    if (msBack > 0) {
      const startDate = new Date(now.getTime() - msBack);
      const endDate = now;
      const fmt = (d) => d.toISOString().slice(0, 19).replace("T", " ");
      start = fmt(startDate);
      end = fmt(endDate);
    }
  }

  if (!start || !end) {
    return res
      .status(400)
      .json({ error: "startTime and endTime (or timeframe) are required" });
  }

  let responded = false;
  const args = [PYTHON_SCRIPT, start, end, tagIDs.join(",")];

  const py = spawn(PYTHON_BIN, args, {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  py.stderr.on("data", (data) => {
    const msg = data.toString();
    stderr += msg;
    console.error("[station-boundaries python stderr]", msg);
  });

  py.on("error", (err) => {
    if (responded || res.headersSent) return;
    responded = true;
    return res.status(500).json({
      error: "Failed to start Python process",
      detail: err.message,
    });
  });

  py.on("close", (code) => {
    if (responded || res.headersSent) return;

    if (code !== 0) {
      responded = true;
      return res.status(500).json({
        error: "Python script failed",
        code,
        stderr,
      });
    }

    try {
      const result = JSON.parse(stdout);
      responded = true;
      return res.json(result);
    } catch (e) {
      responded = true;
      return res.status(500).json({
        error: "Invalid JSON from Python",
        stdout,
        stderr,
      });
    }
  });
});

router.post("/dwell-time", (req, res) => {
  const { startTime, endTime, tagIDs } = req.body;

  if (!startTime || !endTime || !Array.isArray(tagIDs) || tagIDs.length === 0) {
    return res.status(400).json({
      error: "startTime, endTime, and tagIDs[] are required",
    });
  }

  const start = startTime;
  const end = endTime;
  const tagCsv = tagIDs.join(",");
  let responded = false;

  const py = spawn(PYTHON_BIN, [DWELL_SCRIPT, start, end, tagCsv], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

  let stdout = "";
  let stderr = "";

  py.stdout.on("data", (data) => {
    stdout += data.toString();
  });

  py.stderr.on("data", (data) => {
    const msg = data.toString();
    stderr += msg;
    console.error("[dwell-time python stderr]", msg);
  });

  py.on("error", (err) => {
    if (responded || res.headersSent) return;
    responded = true;
    return res.status(500).json({
      error: "Failed to start Python process",
      detail: err.message,
    });
  });

  py.on("close", (code) => {
    if (responded || res.headersSent) return;

    if (code !== 0) {
      responded = true;
      return res.status(500).json({
        error: "Python script failed",
        code,
        stderr,
      });
    }

    try {
      const result = JSON.parse(stdout);
      responded = true;
      return res.json(result);
    } catch (e) {
      responded = true;
      return res.status(500).json({
        error: "Invalid JSON from Python",
        stdout,
        stderr,
      });
    }
  });
});

router.post("/process-analytics", (req, res) => {
  const {
    startTime,
    endTime,
    tagIDs,
    minStationPoints,
    minStationSpanMinutes,
    minStationRadius,
  } = req.body;

  if (!startTime || !endTime || !Array.isArray(tagIDs) || tagIDs.length === 0) {
    return res.status(400).json({
      error: "startTime, endTime, and tagIDs[] are required",
    });
  }

  const start = startTime;
  const end = endTime;
  const tagCsv = tagIDs.join(",");
  const minPoints =
    Number.isFinite(Number(minStationPoints)) && Number(minStationPoints) >= 1
      ? String(Math.floor(Number(minStationPoints)))
      : "200";
  const minSpanMinutes =
    Number.isFinite(Number(minStationSpanMinutes)) && Number(minStationSpanMinutes) >= 0
      ? String(Number(minStationSpanMinutes))
      : "8";
  const minRadius =
    Number.isFinite(Number(minStationRadius)) && Number(minStationRadius) >= 0
      ? String(Number(minStationRadius))
      : "0.3";

  let responded = false;

  const py = spawn(PYTHON_BIN, [PROCESS_SCRIPT, start, end, tagCsv, minPoints, minSpanMinutes, minRadius], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
  });

  let stdout = "";
  let stderr = "";

  py.stdout.setEncoding("utf8");

  py.stdout.on("data", (data) => {
    stdout += data;
  });

  py.stderr.on("data", (data) => {
    const msg = data.toString();
    stderr += msg;
    console.error("[process-analytics python stderr]", msg);
  });

  py.on("error", (err) => {
    if (responded || res.headersSent) return;
    responded = true;
    return res.status(500).json({
      error: "Failed to start Python process",
      detail: err.message,
    });
  });

  py.on("close", (code) => {
    if (responded || res.headersSent) return;

    if (code !== 0) {
      responded = true;
      return res.status(500).json({
        error: "Python script failed",
        exitCode: code,
        stderr,
      });
    }

    try {
      const parsed = JSON.parse(stdout);
      responded = true;
      return res.json(parsed);
    } catch (err) {
      responded = true;
      return res.status(500).json({
        error: "Invalid JSON from Python",
        stdout,
        stderr,
      });
    }
  });
});

module.exports = router;