import "../styles/MovementHistory.css";
import baseAxios from "../../BaseAxios";

import { useEffect, useState, useContext, useRef, useCallback } from "react";
import LocationContext from "../../contexts/LocationContext";
import type { Network } from "../../types/Network";

type HistoryPoint = { x: number; y: number };
type TagData = { tagid: string; name: string };

export default function MovementHistory() {
    const [tagLocations, setTagLocations] = useState<TagData[] | null>(null);
    const [networkInfo, setNetworkInfo] = useState<Network | null>(null);

    const [timeframe, setTimeframe] = useState("hour");
    const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});
    const [tagNames, setTagNames] = useState<Record<string, string>>({});

    const [historiesByTag, setHistoriesByTag] = useState<Record<string, HistoryPoint[]>>({});
    const [distanceByTag, setDistanceByTag] = useState<Record<string, number>>({});

    const [startTime, setStartTime] = useState<string>("");
    const [endTime, setEndTime] = useState<string>("");

    const [location] = useContext(LocationContext);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const startTsRef = useRef<number | null>(null);
    const isPlayingRef = useRef<boolean>(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [durationSec, setDurationSec] = useState<string>("20");

    const PALETTE = [
        "#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd",
        "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"
    ];
    const [colorMap, setColorMap] = useState<Record<string, string>>({});

    const clearCanvas = (canvas: HTMLCanvasElement, c: CanvasRenderingContext2D) => {
        c.clearRect(0, 0, canvas.width, canvas.height);
    };

    const toCanvasXY = (canvas: HTMLCanvasElement, p: HistoryPoint) => {
        const floorplanWidth = networkInfo?.floorplan_width ?? 45;
        const floorplanHeight = networkInfo?.floorplan_height ?? 19.5;
        const cx = canvas.width * (p.x / floorplanWidth);
        const cy = canvas.height - canvas.height * (p.y / floorplanHeight);
        return { cx, cy };
    };

    const drawHistoryColored = (
        canvas: HTMLCanvasElement,
        c: CanvasRenderingContext2D,
        points: HistoryPoint[],
        color: string
    ) => {
        if (!points || points.length === 0) return;
        c.beginPath();
        const s = toCanvasXY(canvas, points[0]);
        c.moveTo(s.cx, s.cy);

        for (let i = 1; i < points.length; i++) {
            const a = toCanvasXY(canvas, points[i - 1]);
            const b = toCanvasXY(canvas, points[i]);
            const midX = (a.cx + b.cx) / 2;
            const midY = (a.cy + b.cy) / 2;
            c.quadraticCurveTo(midX, midY, b.cx, b.cy);

            c.fillStyle = color;
            c.fillRect(b.cx - 2.5, b.cy - 2.5, 5, 5);
        }
        c.strokeStyle = color;
        c.lineWidth = 2;
        c.stroke();
    };

    const drawHistoryProgressColored = (
        canvas: HTMLCanvasElement,
        c: CanvasRenderingContext2D,
        points: HistoryPoint[],
        progress: number,
        color: string
    ) => {
        if (!points || points.length === 0) return;
        const n = points.length;
        if (n === 1) {
            const { cx, cy } = toCanvasXY(canvas, points[0]);
            c.fillStyle = color;
            c.fillRect(cx - 2.5, cy - 2.5, 5, 5);
            return;
        }
        const p = Math.max(0, Math.min(1, progress));
        const totalSegments = n - 1;
        const exactIndex = p * totalSegments;
        const iFull = Math.floor(exactIndex);
        const frac = exactIndex - iFull;

        c.beginPath();
        const s = toCanvasXY(canvas, points[0]);
        c.moveTo(s.cx, s.cy);

        for (let i = 1; i <= iFull; i++) {
            const a = toCanvasXY(canvas, points[i - 1]);
            const b = toCanvasXY(canvas, points[i]);
            const midX = (a.cx + b.cx) / 2;
            const midY = (a.cy + b.cy) / 2;
            c.quadraticCurveTo(midX, midY, b.cx, b.cy);

            c.fillStyle = color;
            c.fillRect(b.cx - 2.5, b.cy - 2.5, 5, 5);
        }

        if (iFull < totalSegments && frac > 0) {
            const a = toCanvasXY(canvas, points[iFull]);
            const b = toCanvasXY(canvas, points[iFull + 1]);
            const tx = a.cx + (b.cx - a.cx) * frac;
            const ty = a.cy + (b.cy - a.cy) * frac;

            const midX = (a.cx + tx) / 2;
            const midY = (a.cy + ty) / 2;
            c.quadraticCurveTo(midX, midY, tx, ty);

            c.fillStyle = color;
            c.fillRect(tx - 2.5, ty - 2.5, 5, 5);
        }

        c.strokeStyle = color;
        c.lineWidth = 2;
        c.stroke();
    };

    const calculateDistanceTraveled = (locations: HistoryPoint[]) => {
        if (!locations || locations.length === 0) return 0;
        let totalDistance = 0;
        const threshold = 0.2;
        const windowSize = 4;
        for (let i = windowSize; i < locations.length; i++) {
            const x1 = locations[i - windowSize].x;
            const y1 = locations[i - windowSize].y;
            const x2 = locations[i].x;
            const y2 = locations[i].y;
            const d = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            if (d >= threshold) totalDistance += d / windowSize;
        }
        return Math.round(totalDistance);
    };

    const toUTCDate = (local: string) => {
        const d = new Date(local);
        return d.toISOString().slice(0, 19).replace("T", " ");
    };

    const getNetworkInfo = async () => {
        try {
            const res = await baseAxios.get<Network[]>(`/network-info/${location}`);
            setNetworkInfo(res.data[0] ?? null);
        } catch (e) {
            console.error("Error fetching network info:", e);
        }
    };

    const getTagList = async () => {
        try {
            const res = await baseAxios.get<TagData[]>(`/taglist/${location}`);
            const json = res.data;
            const selected: Record<string, boolean> = {};
            const names: Record<string, string> = {};
            const colorMapInit: Record<string, string> = { ...colorMap };

            let paletteIdx = Object.keys(colorMapInit).length % PALETTE.length;

            for (let i = 0; i < json.length; i++) {
                const id = json[i].tagid;
                selected[id] = selected[id] ?? false;
                names[id] = json[i].name;
                if (!colorMapInit[id]) {
                    colorMapInit[id] = PALETTE[paletteIdx % PALETTE.length];
                    paletteIdx++;
                }
            }
            setSelectedTags(selected);
            setTagNames(names);
            setColorMap(colorMapInit);
        } catch (e) {
            console.error("Error fetching tag list:", e);
        }
    };

    const loadHistoriesForSelected = useCallback(async () => {
        const tags = Object.keys(selectedTags).filter((t) => selectedTags[t]);
        if (tags.length === 0) {
            setHistoriesByTag({});
            setDistanceByTag({});
            return;
        }
        try {
            const entries = await Promise.all(
                tags.map(async (tag) => {
                    const res = await baseAxios.get(`/tag-history/${tag}/${timeframe}`);
                    const points: HistoryPoint[] = res.data || [];
                    return [tag, points] as const;
                })
            );
            const newMap: Record<string, HistoryPoint[]> = {};
            const distMap: Record<string, number> = {};
            entries.forEach(([tag, pts]) => {
                newMap[tag] = pts;
                distMap[tag] = calculateDistanceTraveled(pts);
            });
            setHistoriesByTag(newMap);
            setDistanceByTag(distMap);
        } catch (e) {
            console.error("Error fetching histories:", e);
        }
    }, [selectedTags, timeframe]);

    const loadRangeForSelected = useCallback(async () => {
        const tags = Object.keys(selectedTags).filter((t) => selectedTags[t]);
        if (tags.length === 0 || !startTime || !endTime) return;
        const utcStart = toUTCDate(startTime);
        const utcEnd = toUTCDate(endTime);
        try {
            const entries = await Promise.all(
                tags.map(async (tag) => {
                    const res = await baseAxios.get(
                        `/tag-history-range/${tag}/${utcStart}/${utcEnd}`
                    );
                    const points: HistoryPoint[] = res.data || [];
                    return [tag, points] as const;
                })
            );
            const newMap: Record<string, HistoryPoint[]> = {};
            const distMap: Record<string, number> = {};
            entries.forEach(([tag, pts]) => {
                newMap[tag] = pts;
                distMap[tag] = calculateDistanceTraveled(pts);
            });
            setHistoriesByTag(newMap);
            setDistanceByTag(distMap);
        } catch (e) {
            console.error("Error fetching range histories:", e);
        }
    }, [selectedTags, startTime, endTime]);

    const stopPlayback = useCallback(() => {
        setIsPlaying(false);
        isPlayingRef.current = false;
        startTsRef.current = null;
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }
    }, []);

    const startPlayback = useCallback(() => {
        const active = Object.keys(selectedTags).filter((t) => selectedTags[t]);
        if (active.length === 0) return;

        const anyPlayable = active.some((t) => (historiesByTag[t]?.length || 0) >= 2);
        if (!anyPlayable) return;

        setIsPlaying(true);
        isPlayingRef.current = true;
        startTsRef.current = performance.now();

        const tick = () => {
            if (!canvasRef.current) return;
            const canvas = canvasRef.current;
            const c = canvas.getContext("2d");
            if (!c) return;

            const now = performance.now();
            const elapsed = startTsRef.current ? now - startTsRef.current : 0;
            const seconds = Math.max(1, parseInt(durationSec || "20", 10));
            const progress = Math.min(1, elapsed / (seconds * 1000));

            clearCanvas(canvas, c);

            for (const tag of active) {
                const pts = historiesByTag[tag] || [];
                if (pts.length === 0) continue;
                const color = colorMap[tag] || "#000";
                drawHistoryProgressColored(canvas, c, pts, progress, color);
            }

            if (progress < 1 && isPlayingRef.current) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                clearCanvas(canvas, c);
                for (const tag of active) {
                    const pts = historiesByTag[tag] || [];
                    if (pts.length === 0) continue;
                    const color = colorMap[tag] || "#000";
                    drawHistoryColored(canvas, c, pts, color);
                }
                stopPlayback();
            }
        };

        rafRef.current = requestAnimationFrame(tick);
    }, [selectedTags, historiesByTag, colorMap, durationSec, stopPlayback, networkInfo]);

    useEffect(() => {
        getNetworkInfo();
    }, [location]);

    useEffect(() => {
        setSelectedTags({});
        setHistoriesByTag({});
        setDistanceByTag({});
    }, [networkInfo]);

    useEffect(() => {
        getTagList();
    }, [networkInfo]);

    useEffect(() => {
        (async () => {
            try {
                const res = await baseAxios.get<TagData[]>(`/taglocations/${location}`);
                setTagLocations(res.data);
            } catch (e) {
                console.error("Error fetching tag locations:", e);
            }
        })();
    }, [location]);

    useEffect(() => {
        if (!startTime && !endTime) {
            loadHistoriesForSelected();
        }
    }, [loadHistoriesForSelected]);

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = 1600;
            canvasRef.current.height = 800;
        }
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (isPlayingRef.current) return;
        const canvas = canvasRef.current;
        const c = canvas.getContext("2d");
        if (!c) return;

        clearCanvas(canvas, c);

        const active = Object.keys(selectedTags).filter((t) => selectedTags[t]);
        for (const tag of active) {
            const pts = historiesByTag[tag] || [];
            if (pts.length === 0) continue;
            const color = colorMap[tag] || "#000";
            drawHistoryColored(canvas, c, pts, color);
        }
    }, [historiesByTag, selectedTags, colorMap, location, networkInfo]);

    useEffect(() => {
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
        const tagid = e.target.value;
        setSelectedTags((prev) => {
            const next = { ...prev, [tagid]: !prev[tagid] };
            return next;
        });
    };

    const handleFetchRange = async () => {
        if (!startTime || !endTime) return;
        await loadRangeForSelected();
    };

    const anySelected = Object.keys(selectedTags).some((t) => selectedTags[t]);
    const anyPlayable =
        anySelected &&
        Object.keys(selectedTags).some((t) => selectedTags[t] && (historiesByTag[t]?.length || 0) >= 2);

    const generateTagList = () => {
        const items: JSX.Element[] = [];
        if (tagLocations != null) {
            for (const tagid of Object.keys(tagNames)) {
                const color = colorMap[tagid] || "#000";
                items.push(
                    <div
                        key={tagid}
                        className={
                            selectedTags[tagid]
                                ? "history-form-element-active"
                                : "history-form-element"
                        }
                        style={{ borderLeft: `6px solid ${color}`, paddingLeft: 8 }}
                    >
                        <input
                            className="taglocation-checkbox"
                            type="checkbox"
                            name="tag"
                            value={tagid}
                            id={tagid}
                            checked={!!selectedTags[tagid]}
                            onChange={handleCheck}
                        />
                        <label htmlFor={tagid} className="checkbox-label">
                            <p>{tagNames[tagid]}</p>
                        </label>
                    </div>
                );
            }
        }
        return items;
    };

    const legend = () => {
        const active = Object.keys(selectedTags).filter((t) => selectedTags[t]);
        if (active.length === 0) return null;
        return (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
                {active.map((t) => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span
                            style={{
                                display: "inline-block",
                                width: 12,
                                height: 12,
                                background: colorMap[t] || "#000",
                                borderRadius: 2,
                            }}
                        />
                        <span style={{ opacity: 0.8 }}>{tagNames[t] || t}</span>
                        <span style={{ opacity: 0.6, fontSize: 12 }}>
                            ({distanceByTag[t] ?? 0} m)
                        </span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="movement-history">
            <div className="movement-history-title">
                <div className="movement-history-title-left">
                    <h1>Movement History</h1>
                    <p>Path taken by selected tags.</p>
                </div>
            </div>

            <div className="movement-history-selector">
                <div className="movement-history-selector-title">
                    <h2>DWV1001 Modules</h2>
                </div>

                <div className="movement-history-tag-list">{generateTagList()}</div>

                <div className="movement-history-time-selector">
                    <div className="movement-history-time-title">
                        <h2>Time Frame</h2>
                    </div>

                    <div className="movement-history-time-list">
                        <div className="time-range-selector" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <label htmlFor="startTime">Start:</label>
                            <input
                                type="datetime-local"
                                id="startTime"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                            <label htmlFor="endTime">End:</label>
                            <input
                                type="datetime-local"
                                id="endTime"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                            <button onClick={handleFetchRange} disabled={!anySelected}>
                                Fetch
                            </button>
                            <span style={{ opacity: 0.7, marginLeft: 8 }}>
                                (Leave empty to use preset timeframe: {timeframe})
                            </span>
                        </div>

                        <div className="playback-controls">
                            <input
                                id="durationSec"
                                type="number"
                                min={1}
                                step={1}
                                value={durationSec}
                                onChange={(e) => setDurationSec(e.target.value)}
                                placeholder="sec"
                            />
                            <button
                                onClick={() => {
                                    if (isPlayingRef.current) stopPlayback();
                                    else startPlayback();
                                }}
                                disabled={!anyPlayable}
                            >
                                {isPlaying ? "Pause" : "Play"}
                            </button>
                        </div>

                        <div style={{ marginTop: 12, color: "white" }}>{legend()}</div>
                    </div>
                </div>
            </div>

            <div className="movement-history-map">
                <div className="map-title">
                    <h2>{networkInfo?.name ?? ""}</h2>
                </div>

                <div
                    className={
                        location === "0x0RT6"
                            ? "dashboard-map-amdc"
                            : location === "0x9999"
                                ? "dashboard-map-dandenong"
                                : "dashboard-map-room"
                    }
                >
                    <canvas id="mapCanvas" ref={canvasRef}></canvas>
                </div>
            </div>
        </div>
    );
}