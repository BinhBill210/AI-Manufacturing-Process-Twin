// src/pages/Collision.tsx
import React, { useEffect, useState, useContext, useRef } from 'react';
import baseAxios from "../../BaseAxios";
import { useNavigate } from 'react-router-dom';
import LocationContext from '../../contexts/LocationContext';
import { ToastContainer, toast } from 'react-toastify';
import { HeatMapGrid } from 'react-grid-heatmap';
import '../styles/Collision.css';
import 'react-toastify/dist/ReactToastify.css';

type Zone = {
    tagid: string;
    inclusion: boolean;
    x: number;
    y: number;
    width: number;
    height: number;
};

interface TagLocation {
    tagid: string;
    x: number;
    y: number;
    object_size: number;
    name: string;
}

interface CollisionLocation {
    Tag1: string;
    Tag2: string;
    x: number;
    y: number;
    z: number;
    collisiontime: Date;
}

interface DistanceFlag {
    [key: string]: boolean;
}

interface CollisionFlags {
    [key: string]: boolean;
}

interface Obstacles {
    obstacleid: number;
    tagid: string;
    networkid: string;
    x: number;
    y: number;
    width: number;
    height: number;
    name: string;
}

interface HeatmapRow {
    dow: number;
    hour: number;
    total_collisions: string | number;
}

export default function Collision() {
    const [location] = useContext(LocationContext);
    const [time, setTime] = useState(Date.now());
    const [tagLocations, setTagLocations] = useState<TagLocation[]>([]);
    const [networkInfo, setNetworkInfo] = useState<any>(null);
    const [networkZones, setNetworkZones] = useState<Zone[]>();
    const [collisionFlag, setCollisionFlag] = useState<CollisionFlags>({});
    const [collisionDistance, setCollisionDistance] = useState(1);
    const [collisionLocations, setCollisionLocation] = useState<CollisionLocation[]>([]);
    const navigate = useNavigate();
    const [data, setData] = useState<number[][]>([]);
    const [distanceFlag, setDistanceFlag] = useState<DistanceFlag>({});
    const [obstacle, setObstacle] = useState<Obstacles[]>([]);
    const [obsFlag, setObsFlag] = useState<DistanceFlag>({});
    const [outOfPathNotified, setOutOfPathNotified] = useState<boolean>(false);

    // Canvas ref so we don't touch other pages' canvases
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    const colorArray = ['blue', 'green', 'pink', 'orange', 'brown', 'yellow'];
    const xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const yLabels = ["9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm"];

    const hours = [9, 10, 11, 12, 13, 14, 15, 16];
    const dayIndexByDow: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4 };

    function AddObstacle() {
        navigate('/addobstacle/');
    }

    async function fetchData() {
        try {
            const response1 = await baseAxios.get(`/network-info/${location}`);
            const response2 = await baseAxios.get(`/network-zones/${location}`);
            const response4 = await baseAxios.get(`/taglocations/${location}`);

            setNetworkInfo(response1.data);
            setNetworkZones(response2.data);
            setTagLocations(response4.data);
        } catch (error) {
            console.log(error);
        }
    }

    const getLocations = async () => {
        try {
            const response = await baseAxios.get(`/taglocations/${location}`);
            setTagLocations(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    const getObstacle = async () => {
        try {
            const response = await baseAxios.get(`/get-obstacle`);
            setObstacle(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    const getHeatmap = async () => {
        try {
            const response = await baseAxios.get<HeatmapRow[]>(`/collisions-heatmap`);
            const tempData: number[][] = hours.map(() => Array(xLabels.length).fill(0));

            for (const row of response.data) {
                const dow = Number(row.dow);
                const hour = Number(row.hour);
                const total = Number(row.total_collisions);
                if (dayIndexByDow[dow] !== undefined) {
                    const yIndex = hours.indexOf(hour);
                    const xIndex = dayIndexByDow[dow];
                    if (yIndex !== -1) {
                        tempData[yIndex][xIndex] = total;
                    }
                }
            }

            setData(tempData);
        } catch (error) {
            console.log(error);
        }
    };

    function drawObstacles(
        canvas: HTMLCanvasElement,
        c: CanvasRenderingContext2D,
        floorplanWidth: number,
        floorplanHeight: number
    ) {
        if (!obstacle) return;

        for (let i = 0; i < obstacle.length; i++) {
            const zone = obstacle[i];
            c.fillStyle = 'blue';

            const x = canvas.width * (zone.x / floorplanWidth);
            const y = canvas.height * (zone.y / floorplanHeight);
            const width = canvas.width * (zone.width / floorplanWidth);
            const height = canvas.height * (zone.height / floorplanHeight);

            c.save();
            c.globalAlpha = 0.3;
            c.fillRect(x, canvas.height - y, width, height);
            c.restore();
        }
    }

    function getTagLocation(tagId: string): [number, number] | null {
        if (tagLocations) {
            const tagIds = Object.keys(tagLocations);

            for (let i = 0; i < tagIds.length; i++) {
                const tagLocation1: TagLocation = tagLocations[parseInt(tagIds[i])];
                const tagId1 = tagLocation1.tagid;

                const hypotenuseLength = Math.sqrt(2) * (tagLocation1.object_size / 2);
                const x = tagLocation1.x + hypotenuseLength;
                const y = tagLocation1.y + hypotenuseLength;

                if (tagId === tagId1) {
                    return [x, y];
                }
            }
        }

        return null;
    }

    function clamp(value: number, min: number, max: number): number {
        return Math.min(Math.max(value, min), max);
    }

    function checkObstacleCollisions() {
        for (let i = 0; i < obstacle.length; i++) {
            const tagCurrentLocation = getTagLocation(obstacle[i].tagid);

            if (tagCurrentLocation) {
                const currentX = tagCurrentLocation[0];
                const currentY = tagCurrentLocation[1];

                const closestX = clamp(currentX, obstacle[i].x, obstacle[i].x + obstacle[i].width);
                const closestY = clamp(currentY, obstacle[i].y, obstacle[i].y + obstacle[i].height);

                const distanceBetween = Math.sqrt(
                    Math.pow(closestX - currentX, 2) +
                    Math.pow(closestY - currentY, 2)
                );

                if (distanceBetween < 1 && !obsFlag[obstacle[i].name]) {
                    toast.error(`Tag ${obstacle[i].tagid} is about to collide with ${obstacle[i].name}`, {
                        autoClose: 6000
                    });
                    setObsFlag(prev => ({ ...prev, [obstacle[i].name]: true }));
                } else if (distanceBetween >= 1 && obsFlag[obstacle[i].name]) {
                    setObsFlag(prev => ({ ...prev, [obstacle[i].name]: false }));
                }
            }
        }
    }

    const generateObstacleList = () => {
        if (!obstacle || obstacle.length === 0) return [];

        return obstacle.map((item: Obstacles) => {
            const { obstacleid, x, y, width, height, name } = item;

            return (
                <li key={obstacleid} className='collision-obstacle-list-item'>
                    <h3 className='collision-obstacle-name'>{name}</h3>
                    <p className='collision-obstacle-x'>X: {x}</p>
                    <p className='collision-obstacle-y'>Y: {y}</p>
                    <p className='collision-obstacle-width'>Width: {width}m</p>
                    <p className='collision-obstacle-height'>Height: {height}m</p>
                    <div className='collision-delete-obstacle'>
                        <div className='collision-delete-segment'>
                            <button
                                className='collision-delete-obstacle-btn'
                                value={obstacleid}
                                onClick={() => deleteObstacle(obstacleid)}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </li>
            );
        });
    };

    const deleteObstacle = async (obstacleID: number) => {
        try {
            await baseAxios.delete(`/obstacle-segment/${obstacleID}`);
        } catch (error) {
            console.error('Error deleting segment:', error);
        }
    };

    const addCollisionLocation = async (tag1Id: string, tag2Id: string, xc: number, yc: number, zc: number) => {
        try {
            await baseAxios.post(`/collisionlocation`, {
                tag1: tag1Id,
                tag2: tag2Id,
                x: xc,
                y: yc,
                z: zc,
            });
        } catch (error) {
            console.error('Error adding location:', error);
        }
    };

    const getCollisionLocations = async () => {
        try {
            const response = await baseAxios.get(`/getCollisionlocations`);
            setCollisionLocation(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    function collisionChecker() {
        if (tagLocations) {
            const tagIds = Object.keys(tagLocations);

            for (let i = 0; i < tagIds.length; i++) {
                const tagLocation1: TagLocation = tagLocations[parseInt(tagIds[i])];
                const tagId1 = tagLocation1.tagid;

                const hypotenuseLength = Math.sqrt(2) * (tagLocation1.object_size / 2);
                const x = tagLocation1.x + hypotenuseLength;
                const y = tagLocation1.y + hypotenuseLength;

                for (let j = i + 1; j < tagIds.length; j++) {
                    const tagLocation2: TagLocation = tagLocations[parseInt(tagIds[j])];
                    const tagId2 = tagLocation2.tagid;
                    if (tagId1 !== tagId2) {
                        const hypotenuseLength1 = Math.sqrt(2) * (tagLocation2.object_size / 2);
                        const x1 = tagLocation2.x + hypotenuseLength1;
                        const y1 = tagLocation2.y + hypotenuseLength1;

                        const distancebtwn = Math.sqrt(
                            Math.pow(x1 - x, 2) +
                            Math.pow(y1 - y, 2)
                        );
                        const sortedTagIds = [tagId1, tagId2].sort().join('_');

                        if (distancebtwn <= collisionDistance) {
                            if (!collisionFlag[sortedTagIds]) {
                                toast.error(`Tag ${tagId1} and Tag ${tagId2} are about to collide!`, {
                                    autoClose: 6000
                                });
                                setCollisionFlag(prev => ({ ...prev, [sortedTagIds]: true }));
                            }

                            if (distancebtwn >= 0 && distancebtwn <= 1 && !distanceFlag[sortedTagIds]) {
                                addCollisionLocation(
                                    tagId1,
                                    tagId2,
                                    ((x1 + x) / 2),
                                    ((y + y1) / 2),
                                    0
                                );
                                setDistanceFlag(prev => ({ ...prev, [sortedTagIds]: true }));
                            }
                        } else if (distancebtwn > collisionDistance && collisionFlag[sortedTagIds]) {
                            setCollisionFlag(prev => ({ ...prev, [sortedTagIds]: false }));
                            setDistanceFlag(prev => ({ ...prev, [sortedTagIds]: false }));
                        }
                    }
                }
            }
        }
    }

    function drawCollisions(
        canvas: HTMLCanvasElement,
        c: CanvasRenderingContext2D,
        floorplanWidth: number,
        floorplanHeight: number
    ) {
        if (collisionLocations) {
            for (let i = 0; i < collisionLocations.length; i++) {
                const x = canvas.width * (collisionLocations[i].x / floorplanWidth);
                const y = canvas.height - (canvas.height * (collisionLocations[i].y / floorplanHeight));
                c.fillStyle = "red";
                c.beginPath();
                const radius = 2;
                c.arc(x, y, radius, 0, 2 * Math.PI);
                c.fill();
            }
        }
    }

    function drawTags(
        canvas: HTMLCanvasElement,
        c: CanvasRenderingContext2D,
        floorplanWidth: number,
        floorplanHeight: number
    ) {
        const tagIds = Object.keys(tagLocations);
        for (let i = 0; i < tagIds.length; i++) {
            const tagLocation: TagLocation = tagLocations[parseInt(tagIds[i])];
            const tagId = tagLocation.tagid;
            const x = canvas.width * (tagLocation.x / floorplanWidth);
            const y = canvas.height - (canvas.height * (tagLocation.y / floorplanHeight));
            const objectSize = canvas.width * (tagLocation.object_size / floorplanWidth);
            const textSize = canvas.height * (tagLocation.object_size / floorplanHeight);

            let outOfArea = false;

            if (networkZones && networkZones.length !== 0) {
                for (let j = 0; j < networkZones.length; j++) {
                    const networkZone: Zone = networkZones[j];
                    if (networkZone.tagid === tagId) {
                        if (
                            networkZone.inclusion &&
                            leftInclusionZone(tagLocation.x, tagLocation.y, networkZone)
                        ) {
                            outOfArea = true;
                        } else if (
                            !networkZone.inclusion &&
                            inExclusionZone(tagLocation.x, tagLocation.y, networkZone)
                        ) {
                            outOfArea = true;
                        }
                    }
                }
            }

            if (outOfArea) {
                c.fillStyle = 'red';
            } else if (tagId === 'c532') {
                c.fillStyle = colorArray[0];
            } else if (tagId === '9c2e') {
                c.fillStyle = colorArray[1];
            } else if (tagId === '9903') {
                c.fillStyle = colorArray[2];
            } else if (tagId === 'd39a') {
                c.fillStyle = colorArray[3];
            } else if (tagId === 'db21') {
                c.fillStyle = colorArray[4];
            } else if (tagId === '96b0') {
                c.fillStyle = colorArray[5];
            }

            c.fillRect(x, y, objectSize, textSize);
            c.font = "13px Arial";
            c.fillStyle = "Black";
            c.fillText(
                outOfArea ? `${tagLocation.name} (out of area)` : tagLocation.name,
                x + 7,
                y - 7
            );
        }

        collisionChecker();
        //leftGantryPath();
    }

    function inExclusionZone(x: number, y: number, zone: Zone) {
        return (
            x > zone.x &&
            x < (zone.x + zone.width) &&
            y < zone.y &&
            y > (zone.y - zone.height)
        );
    }

    function leftInclusionZone(x: number, y: number, zone: Zone) {
        const zoneX = parseFloat(zone.x.toFixed(2));
        const zoneY = parseFloat(zone.y.toFixed(2));
        const zoneWidth = parseFloat(zone.width.toFixed(2));
        const zoneHeight = parseFloat(zone.height.toFixed(2));

        return (
            x < zoneX ||
            x > (zoneX + zoneWidth) ||
            y > zoneY ||
            y < (zoneY - zoneHeight)
        );
    }

    function setCanvasSize() {
        const canvas = canvasRef.current;
        if (!canvas) return;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    // Initial data load when location changes
    useEffect(() => {
        fetchData();
    }, [location]);

    // Polling for live data, heatmap, obstacles, etc.
    useEffect(() => {
        const interval = setInterval(() => setTime(Date.now()), 500);
        getLocations();
        getHeatmap();
        getObstacle();
        checkObstacleCollisions();
        return () => {
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [time]);

    // Drawing effect
    useEffect(() => {
        getCollisionLocations();

        const canvas = canvasRef.current;
        if (!canvas) return;
        const c = canvas.getContext('2d');
        if (!c) return;

        c.clearRect(0, 0, canvas.width, canvas.height);

        if (collisionLocations) {
            drawCollisions(canvas, c, 45, 21);
        }
        if (tagLocations && Object.keys(tagLocations).length > 0 && networkInfo && networkZones) {
            drawTags(canvas, c, 45, 21);
        }
        if (obstacle) {
            drawObstacles(canvas, c, 45, 21);

        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tagLocations, networkInfo, networkZones, collisionLocations, obstacle]);

    // Size canvas once on mount
    useEffect(() => {
        setCanvasSize();
        // If your container can resize dynamically, you may want a ResizeObserver here too.
    }, []);

    return (
        <div className="collision--dashboard">
            <ToastContainer />
            <div className='collision--boxes'>
                <div className='collision-name-box'>
                    <h1 className='collision-name-box-header'>Safety</h1>
                    <p className='collision-name-box-description'>Track hazards in the Factory of the Future</p>
                </div>
                <div className='collision-range-box'>
                    <h2 className='collision-range-box-header'>Safety Distance</h2>
                    <p className='collision-range-box-paragraph'>Use slider to update distance</p>
                    <div className='collision-span--element'>
                        <span>1m</span>
                        <input
                            type='range'
                            min="1"
                            max="3"
                            step="0.1"
                            className='collision-slider'
                            value={collisionDistance}
                            onChange={(e) => setCollisionDistance(parseFloat(e.target.value))}
                        />
                        <span>3m</span>
                    </div>
                    <span>Value: {collisionDistance}</span>
                </div>
            </div>

            <div className='collision-map-box'>
                <div className='collision-map-title'>
                    <h2>{(networkInfo != null) ? networkInfo[0]['name'] : ""}</h2>
                </div>
                <div
                    className={
                        location === "0x0RT6"
                            ? "collision-map collision-map-amdc"
                            : location === "0x1BBA"
                                ? "collision-map collision-map-warehouse"
                                : "collision-map collision-map-room"
                    }
                >
                    <canvas id="collision-map-canvas" ref={canvasRef}></canvas>
                </div>
            </div>

            <div className='collision-heat'>
                <h1 className='collision-heatmap-header'>Collisions Frequency</h1>
                <div
                    className='collision-heat-map-chart'
                    style={{
                        width: "100%",
                        height: "40%",
                        fontFamily: "sans-serif"
                    }}
                >
                    <HeatMapGrid
                        data={data}
                        xLabels={xLabels}
                        yLabels={yLabels}
                        cellRender={(x: any, y: any, value: any) => (
                            <div title={`Pos(${x}, ${y}) = ${value}`}>{value}</div>
                        )}
                        xLabelsStyle={(index: any) => ({
                            color: index % 2 ? "transparent" : "#777",
                            fontSize: "12px"
                        })}
                        yLabelsStyle={() => ({
                            fontSize: "12px",
                            textTransform: "uppercase",
                            color: "#777"
                        })}
                        cellStyle={(_x: any, _y: any, ratio: any) => ({
                            background: `rgb(255, 0, 0, ${ratio})`,
                            fontSize: ".7rem",
                            color: `rgb(0, 0, 0, ${ratio / 2 + 0.4})`
                        })}
                        cellHeight="5rem"
                        xLabelsPos="bottom"
                    />
                </div>
                <h4 className='collision-heatmap--info'>
                    Total number of collisions each day from 9AM to 5PM
                </h4>
            </div>

            <div className='collision--obstacles'>
                <div className='collision-obstacle-segments-title'>
                    <h2 className='collision-obstacle-segments-heading'>Obstacle Lists</h2>
                </div>
                <div className='collision-obstacle-segments-content'>
                    <ul className='collision-obstacle-segments-list'>
                        {generateObstacleList()}
                        <li className='collision-obstacle-list-new'>
                            <button
                                className='collision-new-obstacle-button'
                                onClick={AddObstacle}
                            >
                                Add Obstacle
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
