import os
import sys
import json
import numpy as np
import pandas as pd
import psycopg2
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics import silhouette_score

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL env var not set", file=sys.stderr)
    sys.exit(1)

MAX_ROWS_PER_TAG = 80000
MAX_SILHOUETTE_ROWS = 3000
K_MIN = 3
K_MAX = 8

KMEANS_FIT_MAX = 20000
KMEANS_BATCH = 2048
RNG_SEED = 42

DEFAULT_MIN_STATION_POINTS = 200
DEFAULT_MIN_STATION_SPAN_MINUTES = 8
DEFAULT_MIN_STATION_RADIUS = 0.30


def load_data_from_db(start: str, end: str, tag_ids: list[str]) -> pd.DataFrame:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        query = """
            WITH ranked AS (
              SELECT time, x, y, tagid,
                     ROW_NUMBER() OVER (PARTITION BY tagid ORDER BY time) AS rn
              FROM public.location
              WHERE time BETWEEN %s AND %s
                AND tagid = ANY(%s)
                AND x IS NOT NULL
                AND y IS NOT NULL
            )
            SELECT time, x, y, tagid
            FROM ranked
            WHERE rn <= %s
        """
        df = pd.read_sql_query(query, conn, params=[start, end, tag_ids, MAX_ROWS_PER_TAG])
    finally:
        conn.close()

    if not df.empty:
        df["time"] = pd.to_datetime(df["time"], utc=True, errors="coerce")
        df = df.dropna(subset=["time", "x", "y"])
        df["x"] = pd.to_numeric(df["x"], errors="coerce")
        df["y"] = pd.to_numeric(df["y"], errors="coerce")
        df = df.dropna(subset=["x", "y"])

    print(f"Loaded {len(df)} rows from DB (<= {MAX_ROWS_PER_TAG} per tag)", file=sys.stderr)
    return df


def determine_optimal_clusters(df: pd.DataFrame, k_min: int = K_MIN, k_max: int = K_MAX) -> int:
    coords = df[["x", "y"]].to_numpy()
    n = len(coords)

    if n < max(3, k_min):
        print("Too few points for silhouette; using k=1", file=sys.stderr)
        return 1

    rng = np.random.default_rng(RNG_SEED)

    if n > MAX_SILHOUETTE_ROWS:
        idx = rng.choice(n, size=MAX_SILHOUETTE_ROWS, replace=False)
        sample = coords[idx]
        print(f"Silhouette using sample of {len(sample)} points out of {n} total", file=sys.stderr)
    else:
        sample = coords

    n_s = len(sample)
    max_k = min(k_max, n_s - 1)
    if max_k < k_min:
        print("Silhouette not valid for this sample size; using k=1", file=sys.stderr)
        return 1

    k_range = range(k_min, max_k + 1)
    scores = []

    print("\nAnalyzing optimal number of stations:", file=sys.stderr)
    for k in k_range:
        kmeans = MiniBatchKMeans(
            n_clusters=k,
            random_state=RNG_SEED,
            batch_size=1024,
            n_init="auto",
        )
        labels = kmeans.fit_predict(sample)
        score = silhouette_score(sample, labels)
        scores.append(score)
        print(f"  k={k}: Silhouette={score:.3f}", file=sys.stderr)

    best_i = int(np.argmax(scores))
    optimal_k = list(k_range)[best_i]
    max_silhouette = float(scores[best_i])

    print(f"\n→ Selected k={optimal_k} (highest silhouette score: {max_silhouette:.3f})", file=sys.stderr)
    return optimal_k


def detect_stations_and_assign(
    df: pd.DataFrame,
    n_stations: int,
    min_station_points: int,
    min_station_span_minutes: float,
    min_station_radius: float,
):
    positions = df[["x", "y"]].to_numpy()
    times = df["time"].to_numpy(dtype="datetime64[ns]")
    min_station_span_sec = float(min_station_span_minutes) * 60.0

    if len(positions) == 0:
        return [], np.full(0, -1, dtype=int)

    if n_stations <= 1:
        center = positions.mean(axis=0)
        distances = np.sqrt(np.sum((positions - center) ** 2, axis=1))
        radius = float(np.percentile(distances, 75)) if len(distances) else 0.0

        num_points = int(len(positions))
        span_seconds = float((times.max() - times.min()) / np.timedelta64(1, "s")) if len(times) else 0.0

        if (
            num_points < min_station_points
            or span_seconds < min_station_span_sec
            or radius < min_station_radius
        ):
            print(
                f"Single cluster rejected as noise "
                f"(points={num_points}, span={span_seconds:.1f}s, radius={radius:.2f})",
                file=sys.stderr,
            )
            return [], np.full(len(positions), -1, dtype=int)

        station_info = [{
            "station_id": 1,
            "center_x": float(center[0]),
            "center_y": float(center[1]),
            "radius": radius,
            "num_points": num_points,
            "span_seconds": span_seconds,
        }]

        station_assign = np.full(len(positions), 1, dtype=int)
        return station_info, station_assign

    rng = np.random.default_rng(RNG_SEED)
    n = len(positions)

    if n > KMEANS_FIT_MAX:
        fit_idx = rng.choice(n, size=KMEANS_FIT_MAX, replace=False)
        fit_positions = positions[fit_idx]
    else:
        fit_positions = positions

    kmeans = MiniBatchKMeans(
        n_clusters=n_stations,
        random_state=RNG_SEED,
        batch_size=KMEANS_BATCH,
        n_init="auto",
    )
    kmeans.fit(fit_positions)

    labels = kmeans.predict(positions)
    centers = kmeans.cluster_centers_

    station_info_raw = []
    for cluster_idx in range(n_stations):
      mask = labels == cluster_idx
      cluster_points = positions[mask]
      cluster_times = times[mask]

      if cluster_points.shape[0] == 0:
          continue

      center = centers[cluster_idx]
      distances = np.sqrt(np.sum((cluster_points - center) ** 2, axis=1))
      radius = float(np.percentile(distances, 75)) if len(distances) else 0.0

      num_points = int(cluster_points.shape[0])
      span_seconds = float((cluster_times.max() - cluster_times.min()) / np.timedelta64(1, "s"))

      if num_points < min_station_points:
          continue
      if span_seconds < min_station_span_sec:
          continue
      if radius < min_station_radius:
          continue

      station_info_raw.append(
          {
              "cluster_idx": cluster_idx,
              "center_x": float(center[0]),
              "center_y": float(center[1]),
              "radius": radius,
              "num_points": num_points,
              "span_seconds": span_seconds,
          }
      )

    if not station_info_raw:
        print("No clusters survived noise filtering", file=sys.stderr)
        return [], np.full(len(positions), -1, dtype=int)

    station_info_raw.sort(key=lambda s: s["center_x"])

    cluster_to_station_id: dict[int, int] = {}
    station_info = []
    for new_id, info in enumerate(station_info_raw, start=1):
        cluster_to_station_id[info["cluster_idx"]] = new_id
        station_info.append(
            {
                "station_id": new_id,
                "center_x": info["center_x"],
                "center_y": info["center_y"],
                "radius": info["radius"],
                "num_points": info["num_points"],
                "span_seconds": info["span_seconds"],
            }
        )

    station_assign = np.full(len(labels), -1, dtype=int)
    for i, cluster_idx in enumerate(labels):
        sid = cluster_to_station_id.get(int(cluster_idx))
        if sid is not None:
            station_assign[i] = sid

    print(f"Kept {len(station_info)} stations after noise filtering", file=sys.stderr)
    return station_info, station_assign


def compute_dwell(df: pd.DataFrame, station_assign: np.ndarray, station_ids: list[int]):
    df = df.copy()
    df["station_id"] = station_assign

    dwell_seconds = {sid: 0.0 for sid in station_ids}

    for tagid in df["tagid"].unique():
        df_tag = df[df["tagid"] == tagid].sort_values("time").reset_index(drop=True)
        if df_tag.empty:
            continue

        stations = df_tag["station_id"].to_numpy(dtype=np.int32)
        times_ns = df_tag["time"].to_numpy(dtype="datetime64[ns]").astype("int64")
        times_s = times_ns // 1_000_000_000

        n = len(df_tag)
        if n < 3:
            continue

        current_station = -1
        dwell_start_idx = -1
        out_run = 0

        def close_dwell(exit_idx: int):
            nonlocal current_station, dwell_start_idx, out_run
            if current_station <= 0 or dwell_start_idx < 0:
                return
            delta = int(times_s[exit_idx] - times_s[dwell_start_idx])
            if delta > 0:
                dwell_seconds[int(current_station)] += float(delta)
            current_station = -1
            dwell_start_idx = -1
            out_run = 0

        for i in range(n):
            s = int(stations[i])

            if current_station <= 0:
                if s > 0 and i >= 2:
                    s0 = int(stations[i - 2])
                    s1 = int(stations[i - 1])
                    if s0 == s1 == s:
                        current_station = s
                        dwell_start_idx = i - 2
                        out_run = 0
            else:
                if s == current_station:
                    out_run = 0
                else:
                    out_run += 1
                    if out_run >= 3:
                        exit_idx = max(i - 2, 0)
                        close_dwell(exit_idx)

        if current_station > 0 and dwell_start_idx >= 0:
            close_dwell(n - 1)

    return dwell_seconds


def main():
    if len(sys.argv) < 4:
        print(
            "Usage: python process_analytics.py <startTime> <endTime> <tagIDs_csv> [minStationPoints] [minStationSpanMinutes] [minStationRadius]",
            file=sys.stderr,
        )
        sys.exit(1)

    start = sys.argv[1]
    end = sys.argv[2]
    tag_ids_csv = sys.argv[3]
    tag_ids = [t for t in tag_ids_csv.split(",") if t]

    min_station_points = DEFAULT_MIN_STATION_POINTS
    min_station_span_minutes = DEFAULT_MIN_STATION_SPAN_MINUTES
    min_station_radius = DEFAULT_MIN_STATION_RADIUS

    

    if len(sys.argv) >= 5:
        try:
            min_station_points = max(1, int(float(sys.argv[4])))
        except Exception:
            min_station_points = DEFAULT_MIN_STATION_POINTS

    if len(sys.argv) >= 6:
        try:
            min_station_span_minutes = max(0.0, float(sys.argv[5]))
        except Exception:
            min_station_span_minutes = DEFAULT_MIN_STATION_SPAN_MINUTES

    if len(sys.argv) >= 7:
        try:
            min_station_radius = max(0.0, float(sys.argv[6]))
        except Exception:
            min_station_radius = DEFAULT_MIN_STATION_RADIUS

    print(
        f"Running process analytics for {start} → {end}, tags={tag_ids}, "
        f"min_points={min_station_points}, min_span_minutes={min_station_span_minutes}, min_radius={min_station_radius}",
        file=sys.stderr,
    )

    df = load_data_from_db(start, end, tag_ids)

    if df.empty:
        print(json.dumps({
            "time_range": {"start": start, "end": end},
            "tag_ids": tag_ids,
            "per_tag": {},
            "message": "No data found"
        }))
        return

    per_tag_results = {}

    for tagid in tag_ids:
        df_tag = df[df["tagid"] == tagid]
        if df_tag.empty:
            per_tag_results[tagid] = {
                "n_stations": 0,
                "stations": [],
                "message": "No data"
            }
            continue

        n_stations = determine_optimal_clusters(df_tag)
        station_info, station_assign = detect_stations_and_assign(
            df_tag,
            n_stations,
            min_station_points,
            min_station_span_minutes,
            min_station_radius,
        )

        if not station_info:
            per_tag_results[tagid] = {
                "n_stations": n_stations,
                "stations": [],
                "message": "No valid stations"
            }
            continue

        station_ids = [s["station_id"] for s in station_info]
        dwell_seconds = compute_dwell(df_tag, station_assign, station_ids)

        for s in station_info:
            sid = s["station_id"]
            secs = float(dwell_seconds.get(sid, 0.0))
            s["dwell_seconds"] = secs
            s["dwell_minutes"] = secs / 60.0 if secs else 0.0

        per_tag_results[tagid] = {
            "n_stations": n_stations,
            "stations": station_info
        }

    result = {
        "time_range": {"start": start, "end": end},
        "tag_ids": tag_ids,
        "filters": {
            "min_station_points": min_station_points,
            "min_station_span_minutes": min_station_span_minutes,
            "min_station_radius": min_station_radius,
        },
        "per_tag": per_tag_results
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()