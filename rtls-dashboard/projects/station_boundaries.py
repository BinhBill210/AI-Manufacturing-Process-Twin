# projects/station_boundaries_from_db.py
"""
Station Boundary Detection - Use (fast) K-means clustering to define station locations
Uses data from Postgres 'location' table for a given time range and selected tag IDs.

CLI usage (from Node):
    python station_boundaries_from_db.py <startTime> <endTime> <tagIDs_csv>

Example:
    python station_boundaries_from_db.py "2025-08-31 23:27:00" "2025-10-31 22:27:00" "96b0,abcd"
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
MAX_DB_ROWS = 50000           # max rows to pull from DB
MAX_SILHOUETTE_ROWS = 8000    # max rows for silhouette analysis
K_MIN = 3
K_MAX = 8

# Station filtering knobs (tune these)
# These are to make sure we only keep "real" stations, not random pauses.
MIN_STATION_POINTS = 100          # minimum points for a cluster to count as a station
MIN_STATION_SPAN_SEC = 3 * 60     # minimum time span (seconds) – e.g. 15 minutes
MIN_STATION_RADIUS = 0.30          # minimum radius in meters (ignore tiny jitter blobs)


#########################
# DB LOADING
#########################

def load_data_from_db(start: str, end: str, tag_ids: list[str]) -> pd.DataFrame:
    """
    Load location data from Postgres for a given time window and list of tag IDs.
    Limits row count for performance.
    """
    conn = psycopg2.connect(DATABASE_URL)
    try:
        query = f"""
            SELECT time, x, y
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
    Determine optimal number of clusters using silhouette analysis
    on a sample of the data for speed.
    Returns the optimal k value.
    """
    coords = df[["x", "y"]].values

    if len(coords) < k_min:
        print("Too few points for silhouette; using k=1", file=sys.stderr)
        return 1

    # Sample down for silhouette to avoid O(N * k) on huge N
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
    silhouette_scores_list = []

    print("\nAnalyzing optimal number of stations:", file=sys.stderr)
    for k in k_range:
        kmeans = MiniBatchKMeans(n_clusters=k, random_state=42, batch_size=1024)
        labels = kmeans.fit_predict(sample)
        score = silhouette_score(sample, labels)
        silhouette_scores_list.append(score)
        print(f"  k={k}: Silhouette={score:.3f}", file=sys.stderr)

    optimal_k = k_range[int(np.argmax(silhouette_scores_list))]
    max_silhouette = max(silhouette_scores_list)

    print(
        f"\n→ Selected k={optimal_k} (highest silhouette score: {max_silhouette:.3f})",
        file=sys.stderr,
    )

    return optimal_k


def detect_stations(df: pd.DataFrame, n_stations: int):
    """
    Use MiniBatchKMeans to detect station centers and radii.
    Filters out clusters that look like noise:
      - too few points
      - too short time span
      - too small radius

    Returns a list of station dicts.
    """
    positions = df[["x", "y"]].values
    times = df["time"].values  # pandas datetime64[ns]

    # Degenerate case: single cluster with all points
    if n_stations <= 1:
        if len(positions) == 0:
            return []

        center = positions.mean(axis=0)
        distances = np.sqrt(np.sum((positions - center) ** 2, axis=1))
        radius = float(np.percentile(distances, 75)) if len(distances) else 0.0

        num_points = int(len(positions))
        span_seconds = float(
            (times.max() - times.min()) / np.timedelta64(1, "s")
        ) if len(times) else 0.0

        # Apply thresholds even in this simple case
        if (
            num_points < MIN_STATION_POINTS
            or span_seconds < MIN_STATION_SPAN_SEC
            or radius < MIN_STATION_RADIUS
        ):
            print(
                f"Single-cluster case rejected as noise: "
                f"points={num_points}, span={span_seconds:.1f}s, radius={radius:.2f}",
                file=sys.stderr,
            )
            return []

        return [{
            "station_id": 1,
            "center_x": float(center[0]),
            "center_y": float(center[1]),
            "radius": radius,
            "num_points": num_points,
            "span_seconds": span_seconds,
        }]

    # Multi-cluster case
    kmeans = MiniBatchKMeans(
        n_clusters=n_stations,
        random_state=42,
        batch_size=2048,
    )
    kmeans.fit(positions)
    labels = kmeans.labels_
    station_centers = kmeans.cluster_centers_

    station_info = []

    for i in range(n_stations):
        mask = labels == i
        cluster_points = positions[mask]
        cluster_times = times[mask]

        if len(cluster_points) == 0:
            continue

        center = station_centers[i]
        distances = np.sqrt(np.sum((cluster_points - center) ** 2, axis=1))
        radius = float(np.percentile(distances, 75)) if len(distances) else 0.0

        num_points = int(len(cluster_points))
        span_seconds = float(
            (cluster_times.max() - cluster_times.min()) / np.timedelta64(1, "s")
        )

        # ---- NOISE FILTERS ----
        if num_points < MIN_STATION_POINTS:
            print(
                f"Cluster {i} rejected (too few points: {num_points})",
                file=sys.stderr,
            )
            continue
        if span_seconds < MIN_STATION_SPAN_SEC:
            print(
                f"Cluster {i} rejected (span too short: {span_seconds:.1f}s)",
                file=sys.stderr,
            )
            continue
        if radius < MIN_STATION_RADIUS:
            print(
                f"Cluster {i} rejected (radius too small: {radius:.2f}m)",
                file=sys.stderr,
            )
            continue

        station_info.append(
            {
                "station_id": i,  # will be renumbered
                "center_x": float(center[0]),
                "center_y": float(center[1]),
                "radius": radius,
                "num_points": num_points,
                "span_seconds": span_seconds,
            }
        )

    # Sort left->right and renumber station_id from 1..N
    station_info = sorted(station_info, key=lambda s: s["center_x"])

    for new_id, station in enumerate(station_info, start=1):
        station["station_id"] = new_id

    print(f"Kept {len(station_info)} stations after noise filtering", file=sys.stderr)
    return station_info


#########################
# MAIN (CLI ENTRY POINT)
#########################

def main():
    if len(sys.argv) < 4:
        print(
            "Usage: python station_boundaries_from_db.py <startTime> <endTime> <tagIDs_csv>",
            file=sys.stderr,
        )
        sys.exit(1)

    start = sys.argv[1]
    end = sys.argv[2]
    tag_ids_csv = sys.argv[3]
    tag_ids = [t for t in tag_ids_csv.split(",") if t]

    print(
        f"Running station boundary detection for {start} → {end}, tags={tag_ids}",
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
    station_info = detect_stations(df, n_stations)

    result = {
        "time_range": {"start": start, "end": end},
        "tag_ids": tag_ids,
        "n_stations": n_stations,
        "stations": station_info,
    }

    print(json.dumps(result))


if __name__ == "__main__":
    main()
