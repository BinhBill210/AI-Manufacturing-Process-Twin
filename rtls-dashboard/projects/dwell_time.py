# projects/dwell_time_from_db.py
"""
Dwell Time Analysis from Postgres

Calculates dwell time at each station for the selected tag IDs and time range.
Stations are detected via K-means (like station_boundaries_from_db.py), then
we compute how long the tags spend in each station.

CLI usage:
    python dwell_time_from_db.py <startTime> <endTime> <tagIDs_csv>

Example:
    python dwell_time_from_db.py "2025-08-31 23:27:00" "2025-10-31 22:27:00" "96b0,abcd"
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import psycopg2
from sklearn.cluster import MiniBatchKMeans
from sklearn.metrics import silhouette_score

#########################
# CONFIG
#########################

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    print("ERROR: DATABASE_URL env var not set", file=sys.stderr)
    sys.exit(1)

# Performance knobs
MAX_DB_ROWS = 50000
MAX_SILHOUETTE_ROWS = 8000
K_MIN = 3
K_MAX = 8

# Station filtering knobs (tune as needed)
MIN_STATION_POINTS = 400          # min points for a cluster to count as a station
MIN_STATION_SPAN_SEC = 15 * 60     # min time span in seconds (e.g. 15 min)
MIN_STATION_RADIUS = 0.30          # min radius in meters


#########################
# DB LOADING
#########################

def load_data_from_db(start: str, end: str, tag_ids: list[str]) -> pd.DataFrame:
    """
    Load time/x/y/tagid from Postgres for the given time window and tag IDs.
    """
    conn = psycopg2.connect(DATABASE_URL)
    try:
        query = f"""
            SELECT time, x, y, tagid
            FROM location
            WHERE time BETWEEN %s AND %s
              AND tagid = ANY(%s)
              AND x IS NOT NULL
              AND y IS NOT NULL
            ORDER BY time
            LIMIT {MAX_DB_ROWS}
        """
        df = pd.read_sql_query(query, conn, params=[start, end, tag_ids])
    finally:
        conn.close()

    if not df.empty:
        df["time"] = pd.to_datetime(df["time"])

    print(f"Loaded {len(df)} rows from DB", file=sys.stderr)
    return df


#########################
# K-MEANS + SILHOUETTE
#########################

def determine_optimal_clusters(df: pd.DataFrame,
                               k_min: int = K_MIN,
                               k_max: int = K_MAX) -> int:
    """
    Determine optimal number of clusters using silhouette analysis on a sample.
    """
    coords = df[["x", "y"]].values

    if len(coords) < k_min:
        print("Too few points for silhouette; using k=1", file=sys.stderr)
        return 1

    # Sample down for silhouette
    if len(coords) > MAX_SILHOUETTE_ROWS:
        idx = np.random.choice(len(coords), size=MAX_SILHOUETTE_ROWS, replace=False)
        sample = coords[idx]
        print(
            f"Silhouette using sample of {len(sample)} points "
            f"out of {len(coords)} total",
            file=sys.stderr,
        )
    else:
        sample = coords

    k_range = range(k_min, min(k_max, len(sample)) + 1)
    scores = []

    print("\nAnalyzing optimal number of stations:", file=sys.stderr)
    for k in k_range:
        kmeans = MiniBatchKMeans(n_clusters=k, random_state=42, batch_size=1024)
        labels = kmeans.fit_predict(sample)
        score = silhouette_score(sample, labels)
        scores.append(score)
        print(f"  k={k}: Silhouette={score:.3f}", file=sys.stderr)

    optimal_k = k_range[int(np.argmax(scores))]
    max_silhouette = max(scores)
    print(
        f"\n→ Selected k={optimal_k} (highest silhouette score: {max_silhouette:.3f})",
        file=sys.stderr,
    )
    return optimal_k


def detect_stations_and_assign(df: pd.DataFrame, n_stations: int):
    """
    Run MiniBatchKMeans to detect stations and assign each row to a station_id.

    Returns:
      - station_info: list of station dicts
      - station_assign: numpy array of station_id (>=1) or -1 for "no station"
    """
    positions = df[["x", "y"]].values
    times = df["time"].values  # datetime64[ns]

    if len(positions) == 0:
        return [], np.full(0, -1, dtype=int)

    # Degenerate case: single cluster
    if n_stations <= 1:
        center = positions.mean(axis=0)
        distances = np.sqrt(np.sum((positions - center) ** 2, axis=1))
        radius = float(np.percentile(distances, 75)) if len(distances) else 0.0

        num_points = int(len(positions))
        span_seconds = float(
            (times.max() - times.min()) / np.timedelta64(1, "s")
        ) if len(times) else 0.0

        if (
            num_points < MIN_STATION_POINTS
            or span_seconds < MIN_STATION_SPAN_SEC
            or radius < MIN_STATION_RADIUS
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
        # All points belong to station 1
        station_assign = np.full(len(positions), 1, dtype=int)
        return station_info, station_assign

    # Multi-cluster case
    kmeans = MiniBatchKMeans(
        n_clusters=n_stations,
        random_state=42,
        batch_size=2048,
    )
    labels = kmeans.fit_predict(positions)
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

        num_points = int(len(cluster_points))
        span_seconds = float(
            (cluster_times.max() - cluster_times.min()) / np.timedelta64(1, "s")
        )

        # Noise filters
        if num_points < MIN_STATION_POINTS:
            print(
                f"Cluster {cluster_idx} rejected (too few points: {num_points})",
                file=sys.stderr,
            )
            continue
        if span_seconds < MIN_STATION_SPAN_SEC:
            print(
                f"Cluster {cluster_idx} rejected (span too short: {span_seconds:.1f}s)",
                file=sys.stderr,
            )
            continue
        if radius < MIN_STATION_RADIUS:
            print(
                f"Cluster {cluster_idx} rejected (radius too small: {radius:.2f}m)",
                file=sys.stderr,
            )
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

    # Sort left->right and renumber station_id 1..N
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

    # Build station assignment per row
    station_assign = np.full(len(labels), -1, dtype=int)
    for idx, cluster_idx in enumerate(labels):
        sid = cluster_to_station_id.get(cluster_idx)
        if sid is not None:
            station_assign[idx] = sid

    print(f"Kept {len(station_info)} stations after noise filtering", file=sys.stderr)
    return station_info, station_assign


#########################
# DWELL COMPUTATION
#########################

def compute_dwell(df: pd.DataFrame, station_assign: np.ndarray, station_ids: list[int]):
    """
    Compute total dwell time per station across all selected tag IDs.

    We walk each tag's time series, compute time deltas between samples,
    and accumulate deltas into the station where that sample is assigned.
    """
    df = df.copy()
    df["station_id"] = station_assign

    dwell_seconds = {sid: 0.0 for sid in station_ids}

    for tagid in df["tagid"].unique():
        df_tag = df[df["tagid"] == tagid].sort_values("time").reset_index(drop=True)

        if df_tag.empty:
            continue

        df_tag["time_delta"] = df_tag["time"].diff().dt.total_seconds()
        df_tag.loc[0, "time_delta"] = 0.0  # first sample gets 0

        for _, row in df_tag.iterrows():
            sid = int(row["station_id"])
            delta = float(row["time_delta"] or 0.0)

            if sid > 0 and delta > 0:
                dwell_seconds[sid] += delta

    return dwell_seconds


#########################
# MAIN
#########################

def main():
    if len(sys.argv) < 4:
        print(
            "Usage: python dwell_time_from_db.py <startTime> <endTime> <tagIDs_csv>",
            file=sys.stderr,
        )
        sys.exit(1)

    start = sys.argv[1]
    end = sys.argv[2]
    tag_ids_csv = sys.argv[3]
    tag_ids = [t for t in tag_ids_csv.split(",") if t]

    print(
        f"Running dwell time analysis for {start} → {end}, tags={tag_ids}",
        file=sys.stderr,
    )

    df = load_data_from_db(start, end, tag_ids)

    if df.empty:
        result = {
            "time_range": {"start": start, "end": end},
            "tag_ids": tag_ids,
            "stations": [],
            "message": "No data found for this time range and tag IDs",
        }
        print(json.dumps(result))
        return

    n_stations = determine_optimal_clusters(df)
    station_info, station_assign = detect_stations_and_assign(df, n_stations)

    if not station_info:
        result = {
            "time_range": {"start": start, "end": end},
            "tag_ids": tag_ids,
            "n_stations": n_stations,
            "stations": [],
            "message": "No valid stations after filtering",
        }
        print(json.dumps(result))
        return

    station_ids = [s["station_id"] for s in station_info]
    dwell_seconds = compute_dwell(df, station_assign, station_ids)

    # Attach dwell to station_info
    for s in station_info:
        sid = s["station_id"]
        secs = dwell_seconds.get(sid, 0.0)
        s["dwell_seconds"] = secs
        s["dwell_minutes"] = secs / 60.0 if secs else 0.0

    result = {
        "time_range": {"start": start, "end": end},
        "tag_ids": tag_ids,
        "n_stations": n_stations,
        "stations": station_info,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
