import "../styles/ProcessAnalytics.css";
import baseAxios from "../../BaseAxios";

import { useEffect, useState, useContext, useCallback } from "react";
import LocationContext from "../../contexts/LocationContext";
import type { Network } from "../../types/Network";

type TagData = { tagid: string; name: string };

type ProcessAnalyticsPayload = {
  networkID: string;
  tagIDs: string[];
  startTime?: string;
  endTime?: string;
  minStationPoints?: number;
  minStationSpanMinutes?: number;
  minStationRadius?: number;
};

type Station = {
  station_id: number;
  center_x: number;
  center_y: number;
  radius: number;
  num_points: number;
  span_seconds?: number;
  dwell_seconds?: number;
  dwell_minutes?: number;
};

type AnalyticsResult = {
  per_tag?: {
    [tagid: string]: {
      n_stations?: number;
      stations?: Station[];
      message?: string;
    };
  };
  message?: string;
};

const PALETTE = [
  "#1f77b4",
  "#ff7f0e",
  "#2ca02c",
  "#d62728",
  "#9467bd",
  "#8c564b",
  "#e377c2",
  "#7f7f7f",
  "#bcbd22",
  "#17becf",
];

export default function ProcessAnalytics() {
  const [tagLocations, setTagLocations] = useState<TagData[] | null>(null);
  const [networkInfo, setNetworkInfo] = useState<Network | null>(null);

  const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
  const [tagNames, setTagNames] = useState<Record<string, string>>({});

  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");

  const [minStationPoints, setMinStationPoints] = useState<string>("200");
  const [minStationSpanMinutes, setMinStationSpanMinutes] = useState<string>("8");
  const [minStationRadius, setMinStationRadius] = useState<string>("0.3");

  const [analyticsData, setAnalyticsData] = useState<AnalyticsResult | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(false);

  const [location] = useContext(LocationContext);
  const [colorMap, setColorMap] = useState<Record<string, string>>({});

  const [viewMode, setViewMode] = useState<"stations" | "dwell">("stations");

  const [visibleTags, setVisibleTags] = useState<Record<string, boolean>>({});

  const toUTCDate = (local: string) => {
    const d = new Date(local);
    return d.toISOString().slice(0, 19).replace("T", " ");
  };

  const getNetworkInfo = useCallback(async () => {
    try {
      const res = await baseAxios.get<Network[]>(`/network-info/${location}`);
      setNetworkInfo(res.data[0] ?? null);
    } catch (e) {
      console.error("Error fetching network info:", e);
    }
  }, [location]);

  const getFloorplanDims = () => {
    return {
      width: networkInfo?.floorplan_width ?? 45,
      height: networkInfo?.floorplan_height ?? 19.5,
    };
  };

  const getTagList = useCallback(async () => {
    try {
      const res = await baseAxios.get<TagData[]>(`/taglist/${location}`);
      const json = res.data;

      const sel: Record<string, boolean> = {};
      const names: Record<string, string> = {};

      json.forEach((t) => {
        sel[t.tagid] = sel[t.tagid] ?? false;
        names[t.tagid] = t.name;
      });

      setSelectedTags(sel);
      setTagNames(names);

      setColorMap((prev) => {
        const next = { ...prev };
        let paletteIndex = Object.keys(next).length % PALETTE.length;

        for (const { tagid } of json) {
          if (!next[tagid]) {
            next[tagid] = PALETTE[paletteIndex % PALETTE.length];
            paletteIndex++;
          }
        }
        return next;
      });
    } catch (e) {
      console.error("Error fetching tag list:", e);
    }
  }, [location]);

  const getTagLocations = useCallback(async () => {
    try {
      const res = await baseAxios.get<TagData[]>(`/taglocations/${location}`);
      setTagLocations(res.data);
    } catch (e) {
      console.error("Error fetching tag locations:", e);
    }
  }, [location]);

  const handleRunAnalytics = async () => {
    const activeTags = Object.keys(selectedTags).filter((t) => selectedTags[t]);

    if (!activeTags.length) {
      setAnalyticsError("Select at least one tag.");
      return;
    }
    if (!startTime || !endTime) {
      setAnalyticsError("Select a start and end time.");
      return;
    }

    const parsedMinStationPoints = parseInt(minStationPoints, 10);
    const parsedMinStationSpanMinutes = parseFloat(minStationSpanMinutes);
    const parsedMinStationRadius = parseFloat(minStationRadius);

    if (!Number.isFinite(parsedMinStationPoints) || parsedMinStationPoints < 1) {
      setAnalyticsError("Min station points must be at least 1.");
      return;
    }

    if (!Number.isFinite(parsedMinStationSpanMinutes) || parsedMinStationSpanMinutes < 0) {
      setAnalyticsError("Min station span minutes must be 0 or more.");
      return;
    }

    if (!Number.isFinite(parsedMinStationRadius) || parsedMinStationRadius < 0) {
      setAnalyticsError("Min station radius must be 0 or more.");
      return;
    }

    setAnalyticsError(null);
    setAnalyticsLoading(true);

    try {
      const payload: ProcessAnalyticsPayload = {
        networkID: String(location),
        tagIDs: activeTags,
        startTime: toUTCDate(startTime),
        endTime: toUTCDate(endTime),
        minStationPoints: parsedMinStationPoints,
        minStationSpanMinutes: parsedMinStationSpanMinutes,
        minStationRadius: parsedMinStationRadius,
      };

      const res = await baseAxios.post<AnalyticsResult>("/process-analytics", payload);
      setAnalyticsData(res.data);

      const nextVisible: Record<string, boolean> = {};
      activeTags.forEach((t) => (nextVisible[t] = true));
      setVisibleTags(nextVisible);
    } catch (e) {
      setAnalyticsError("Failed to run process analytics.");
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    getNetworkInfo();
  }, [getNetworkInfo]);

  useEffect(() => {
    if (networkInfo) getTagList();
  }, [networkInfo, getTagList]);

  useEffect(() => {
    getTagLocations();
  }, [getTagLocations]);

  const generateTagList = () =>
    Object.keys(tagNames).map((tagid) => {
      const color = colorMap[tagid] || "#000";
      return (
        <div
          key={tagid}
          className={
            selectedTags[tagid]
              ? "process-history-form-element-active"
              : "process-history-form-element"
          }
          style={{
            borderLeft: `6px solid ${color}`,
            paddingLeft: 8,
          }}
        >
          <input
            type="checkbox"
            value={tagid}
            id={tagid}
            checked={!!selectedTags[tagid]}
            onChange={() =>
              setSelectedTags((prev) => ({
                ...prev,
                [tagid]: !prev[tagid],
              }))
            }
          />
          <label htmlFor={tagid} className="process-checkbox-label">
            <p>{tagNames[tagid]}</p>
          </label>
        </div>
      );
    });

  const legend = () => {
    const active = Object.keys(selectedTags).filter((t) => selectedTags[t]);
    if (!active.length) return null;

    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {active.map((t) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 12,
                background: colorMap[t],
                borderRadius: 2,
                display: "inline-block",
              }}
            />
            <span>{tagNames[t]}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderAnalyticsVisibilityPanel = () => {
    if (!analyticsData?.per_tag) return null;

    const tagIds = Object.keys(analyticsData.per_tag);
    if (!tagIds.length) return null;

    return (
      <div className="process-analytics-visibility-panel">
        <div className="process-analytics-visibility-title">Show on map</div>

        <div className="process-analytics-visibility-list">
          {tagIds.map((tagid) => {
            const name = tagNames[tagid] ?? tagid;
            const color = colorMap[tagid] ?? "#0f0";
            const checked = visibleTags[tagid] ?? true;

            return (
              <label
                key={tagid}
                className="process-analytics-visibility-row"
                style={{ borderLeft: `6px solid ${color}` }}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() =>
                    setVisibleTags((prev) => ({
                      ...prev,
                      [tagid]: !(prev[tagid] ?? true),
                    }))
                  }
                />
                <span className="process-analytics-visibility-name">{name}</span>
              </label>
            );
          })}
        </div>

        <div className="process-analytics-visibility-actions">
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              tagIds.forEach((t) => (next[t] = true));
              setVisibleTags(next);
            }}
          >
            Show all
          </button>
          <button
            type="button"
            onClick={() => {
              const next: Record<string, boolean> = {};
              tagIds.forEach((t) => (next[t] = false));
              setVisibleTags(next);
            }}
          >
            Hide all
          </button>
        </div>
      </div>
    );
  };

  const renderStationOverlay = () => {
    if (viewMode !== "stations") return null;
    if (!analyticsData?.per_tag) return null;

    const { width, height } = getFloorplanDims();

    return (
      <>
        {Object.entries(analyticsData.per_tag).flatMap(([tagid, tagData]) => {
          if (visibleTags[tagid] === false) return [];

          const tagColor = colorMap[tagid] ?? "#0f0";

          return (tagData.stations ?? []).map((s) => {
            const leftPct = (s.center_x / width) * 100;
            const topPct = 100 - (s.center_y / height) * 100;
            const radiusPct = ((s.radius * 2) / width) * 100;

            return (
              <div
                key={`${tagid}-${s.station_id}`}
                style={{
                  position: "absolute",
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: `${radiusPct}%`,
                  height: `${radiusPct}%`,
                  transform: "translate(-50%, -50%)",
                  borderRadius: "50%",
                  border: `2px solid ${tagColor}`,
                  background: `${tagColor}2E`,
                  boxShadow: `0 0 10px ${tagColor}80`,
                  pointerEvents: "none",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    color: "#000000",
                    fontWeight: "bold",
                  }}
                >
                  S{s.station_id}
                </div>
              </div>
            );
          });
        })}
      </>
    );
  };

  const renderDwellChart = () => {
    if (viewMode !== "dwell") return null;

    const perTag = analyticsData?.per_tag;
    if (!perTag) return null;

    const visibleTagIds = Object.keys(perTag).filter((tagid) => visibleTags[tagid] !== false);
    if (!visibleTagIds.length) {
      return (
        <div style={{ marginTop: 20, color: "#fff" }}>
          <h3>No tags enabled.</h3>
          <p style={{ opacity: 0.7 }}>Tick tags in “Show on map” to display dwell bars.</p>
        </div>
      );
    }

    const stationSet = new Set<number>();
    const dwellByStation: Record<number, Record<string, number>> = {};

    for (const tagid of visibleTagIds) {
      const stations = perTag[tagid]?.stations ?? [];
      for (const s of stations) {
        const dwell = s.dwell_minutes ?? 0;
        if (dwell <= 0) continue;
        stationSet.add(s.station_id);

        if (!dwellByStation[s.station_id]) dwellByStation[s.station_id] = {};
        dwellByStation[s.station_id][tagid] = dwellByStation[s.station_id][tagid]
          ? dwellByStation[s.station_id][tagid] + dwell
          : dwell;
      }
    }

    const stationIds = Array.from(stationSet).sort((a, b) => a - b);

    if (!stationIds.length) {
      return (
        <div style={{ marginTop: 20, color: "#fff" }}>
          <h3>No dwell time detected.</h3>
        </div>
      );
    }

    let maxDwell = 0.0001;
    for (const sid of stationIds) {
      const row = dwellByStation[sid] ?? {};
      for (const tagid of visibleTagIds) {
        const v = row[tagid] ?? 0;
        if (v > maxDwell) maxDwell = v;
      }
    }

    const chartHeight = 300;
    const margin = { top: 24, right: 18, bottom: 70, left: 70 };

    const groupWidth = 54;
    const chartWidth = Math.max(700, margin.left + margin.right + stationIds.length * groupWidth);

    const barAreaWidth = chartWidth - margin.left - margin.right;
    const barAreaHeight = chartHeight - margin.top - margin.bottom;

    const tagsCount = visibleTagIds.length;
    const innerGap = 4;
    const groupGap = 10;

    const perGroup = barAreaWidth / stationIds.length;
    const effectiveGroup = Math.max(groupWidth, perGroup);

    const usable = Math.max(1, effectiveGroup - groupGap);
    const barWidth = Math.max(6, (usable - innerGap * (tagsCount - 1)) / tagsCount);

    const xForStation = (idx: number) => margin.left + idx * effectiveGroup + groupGap / 2;

    const yForValue = (v: number) => {
      const clamped = Math.max(0, v);
      const h = (clamped / maxDwell) * barAreaHeight;
      return chartHeight - margin.bottom - h;
    };

    const hForValue = (v: number) => {
      const clamped = Math.max(0, v);
      return (clamped / maxDwell) * barAreaHeight;
    };

    return (
      <div style={{ marginTop: 20 }}>
        <h3 style={{ color: "white", marginTop: 0, marginBottom: 8 }}>
          Dwell Time per Station (by tag)
        </h3>
        <p style={{ color: "white", opacity: 0.7, marginBottom: 12 }}>
          Each station shows one bar per visible tag. Colours match the map.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
          {visibleTagIds.map((tagid) => (
            <div key={tagid} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 12,
                  height: 12,
                  background: colorMap[tagid],
                  borderRadius: 2,
                  display: "inline-block",
                }}
              />
              <span style={{ color: "white" }}>{tagNames[tagid] ?? tagid}</span>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            padding: 16,
            background: "#171717",
            borderRadius: 12,
            overflowX: "auto",
          }}
        >
          <svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
            <line
              x1={margin.left}
              y1={margin.top}
              x2={margin.left}
              y2={chartHeight - margin.bottom}
              stroke="#888"
            />

            <line
              x1={margin.left}
              y1={chartHeight - margin.bottom}
              x2={chartWidth - margin.right}
              y2={chartHeight - margin.bottom}
              stroke="#888"
            />

            {[0, 0.5, 1].map((t, idx) => {
              const value = t * maxDwell;
              const y = margin.top + (1 - t) * barAreaHeight;
              return (
                <g key={idx}>
                  <line
                    x1={margin.left - 4}
                    y1={y}
                    x2={chartWidth - margin.right}
                    y2={y}
                    stroke="#333"
                    strokeDasharray="2,4"
                  />
                  <text
                    x={margin.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={10}
                    fill="#ccc"
                  >
                    {value.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {stationIds.map((stationId, i) => {
              const row = dwellByStation[stationId] ?? {};
              const baseX = xForStation(i);

              return (
                <g key={stationId}>
                  {visibleTagIds.map((tagid, j) => {
                    const v = row[tagid] ?? 0;
                    const x = baseX + j * (barWidth + innerGap);
                    const y = yForValue(v);
                    const h = hForValue(v);
                    const fill = colorMap[tagid] ?? "#00ff9d";

                    if (v <= 0) return null;

                    return (
                      <g key={`${stationId}-${tagid}`}>
                        <rect x={x} y={y} width={barWidth} height={h} fill={fill} rx={3} />
                        <text
                          x={x + barWidth / 2}
                          y={y - 4}
                          textAnchor="middle"
                          fontSize={10}
                          fill="#fff"
                        >
                          {v.toFixed(1)}
                        </text>
                      </g>
                    );
                  })}

                  <text
                    x={baseX + ((barWidth + innerGap) * visibleTagIds.length - innerGap) / 2}
                    y={chartHeight - margin.bottom + 18}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#eee"
                  >
                    S{stationId}
                  </text>
                </g>
              );
            })}

            <text x={margin.left} y={margin.top - 8} textAnchor="start" fontSize={11} fill="#ccc">
              Dwell time (minutes)
            </text>
            <text
              x={(chartWidth + margin.left - margin.right) / 2}
              y={chartHeight - 10}
              textAnchor="middle"
              fontSize={11}
              fill="#ccc"
            >
              Stations
            </text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div className="process-analytics">
      <div className="process-analytics-title">
        <div className="process-analytics-title-left">
          <h1>Process Analytics</h1>
          <p>Detect stations or analyse dwell time across selected tags.</p>
        </div>
      </div>

      <div className="process-analytics-selector">
        <div className="process-analytics-selector-title">
          <h2>DWV1001 Modules</h2>
        </div>

        <div className="process-analytics-tag-list">{generateTagList()}</div>

        <div className="process-analytics-time-selector">
          <div className="process-analytics-time-title">
            <h2>Time Frame</h2>
          </div>

          <div className="process-analytics-time-list">
            <div
              className="process-time-range-selector"
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <label htmlFor="pa-startTime">Start:</label>
              <input
                id="pa-startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
              <label htmlFor="pa-endTime">End:</label>
              <input
                id="pa-endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />

              <button onClick={handleRunAnalytics} disabled={!Object.values(selectedTags).some(Boolean)}>
                Run Analytics
              </button>
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
                color: "white",
              }}
            >
              <label htmlFor="pa-minStationPoints">Min station points</label>
              <input
                id="pa-minStationPoints"
                type="number"
                min={1}
                step={1}
                value={minStationPoints}
                onChange={(e) => setMinStationPoints(e.target.value)}
              />

              <label htmlFor="pa-minStationSpanMinutes">Min station span mins</label>
              <input
                id="pa-minStationSpanMinutes"
                type="number"
                min={0}
                step={1}
                value={minStationSpanMinutes}
                onChange={(e) => setMinStationSpanMinutes(e.target.value)}
              />

              <label htmlFor="pa-minStationRadius">Min station radius</label>
              <input
                id="pa-minStationRadius"
                type="number"
                min={0}
                step={0.1}
                value={minStationRadius}
                onChange={(e) => setMinStationRadius(e.target.value)}
              />
            </div>

            <div style={{ marginTop: 12, color: "white" }}>{legend()}</div>

            <div style={{ marginTop: 12 }}>
              {analyticsLoading ? (
                <p style={{ color: "white" }}>Running analytics…</p>
              ) : analyticsError ? (
                <p style={{ color: "salmon" }}>{analyticsError}</p>
              ) : analyticsData ? (
                renderAnalyticsVisibilityPanel()
              ) : (
                <p style={{ color: "white", opacity: 0.7 }}>No analytics run yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          marginLeft: 24,
          padding: 16,
          background: "#111",
          borderRadius: 12,
          minHeight: 500,
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            onClick={() => setViewMode("stations")}
            disabled={!analyticsData}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: viewMode === "stations" ? "#fff" : "rgba(255,255,255,0.1)",
              color: viewMode === "stations" ? "#000" : "#fff",
              fontWeight: 600,
              cursor: analyticsData ? "pointer" : "not-allowed",
              opacity: analyticsData ? 1 : 0.5,
            }}
          >
            Station Boundaries
          </button>

          <button
            onClick={() => setViewMode("dwell")}
            disabled={!analyticsData}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: "none",
              background: viewMode === "dwell" ? "#fff" : "rgba(255,255,255,0.1)",
              color: viewMode === "dwell" ? "#000" : "#fff",
              fontWeight: 600,
              cursor: analyticsData ? "pointer" : "not-allowed",
              opacity: analyticsData ? 1 : 0.5,
            }}
          >
            Dwell Time
          </button>
        </div>

        {!analyticsData && (
          <div style={{ color: "#777", textAlign: "center", marginTop: 40 }}>
            Run analytics to view stations or dwell time.
          </div>
        )}

        {analyticsData && viewMode === "stations" && (
          <div
            className={
              location === "0x0RT6"
                ? "dashboard-map-amdc"
                : location === "0x9999"
                  ? "dashboard-map-dandenong"
                  : "dashboard-map-room"
            }
            style={{
              position: "relative",
              borderRadius: 12,
              overflow: "hidden",
              minHeight: 500,
            }}
          >
            {renderStationOverlay()}
          </div>
        )}

        {analyticsData && viewMode === "dwell" && renderDwellChart()}
      </div>
    </div>
  );
}