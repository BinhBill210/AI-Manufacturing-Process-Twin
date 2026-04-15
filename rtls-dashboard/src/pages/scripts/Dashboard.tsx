import React, { useEffect, useState, useContext } from 'react';
import baseAxios from "../../BaseAxios";
import '../styles/Dashboard.css';
import { Network } from '../../types/Network';
import { Zone } from '../../types/Zone';
import { TagLocation } from '../../types/TagLocation';
import { PeopleEvent } from '../../types/PeopleEvent';

import DataBox from '../../components/scripts/DataBox';
import Barchart from '../../components/charts/scripts/Barchart';
import Linechart from '../../components/charts/scripts/Linechart';

import LocationContext from '../../contexts/LocationContext';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


export default function Dashboard() {
    const [tagsOutside, setTagsOutside] = useState<Record<string, boolean>>({});
    const [location] = useContext(LocationContext);
    const [time, setTime] = useState(Date.now());
    const [tagLocations, setTagLocations] = useState<TagLocation[]>([]);
    const [networkInfo, setNetworkInfo] = useState<Network | null>(null);
    const [networkZones, setNetworkZones] = useState<Zone[]>([]);
    const [tagAccuracy, setTagAccuracy] = useState<Record<string, number>>({});

    const [factoryEntranceEvents, setFactoryEntranceEvents] = useState<PeopleEvent[]>([]);
    const [factoryExitEvents, setFactoryExitEvents] = useState<PeopleEvent[]>([]);

    const [manufactoringEntranceEvents, setManufactoringEntranceEvents] = useState<PeopleEvent[]>([]);
    const [manufactoringExitEvents, setManufactoringExitEvents] = useState<PeopleEvent[]>([]);

    const fofActivity = [30, 100, 85, 90, 85, 76, 25];
    const warehouseActivity = [56, 100, 95, 90, 85, 76, 40];
    const roomActivity = [80, 75, 95, 80, 85, 57, 90];

    const colorArray = ['blue', 'green', 'pink', 'orange', 'brown', 'yellow'];

    async function fetchData() {
        try {
            const response1 = await baseAxios.get<Network[]>(`/network-info/${location}`);
            const response2 = await baseAxios.get<Zone[]>(`/network-zones/${location}`);
            const response4 = await baseAxios.get<TagLocation[]>(`/taglocations/${location}`);
            const response5 = await baseAxios.get<Record<string, number>>(`/tag-accuracy/${location}`);
            const response6 = await baseAxios.get<PeopleEvent[]>('/people-counter/entrance/factory');
            const response7 = await baseAxios.get<PeopleEvent[]>('/people-counter/exit/factory');
            const response8 = await baseAxios.get<PeopleEvent[]>('/people-counter/entrance/manufactoring');
            const response9 = await baseAxios.get<PeopleEvent[]>('/people-counter/exit/manufactoring');

            setNetworkInfo(response1.data[0] ?? null);
            setNetworkZones(response2.data);
            setTagLocations(response4.data);
            setTagAccuracy(response5.data);

            setFactoryEntranceEvents(response6.data);
            setFactoryExitEvents(response7.data);
            setManufactoringEntranceEvents(response8.data);
            setManufactoringExitEvents(response9.data);
        } catch (error) {
            console.log(error);
        }
    }

    const getLocations = async () => {
        try {
            const response = await baseAxios.get<TagLocation[]>(`/taglocations/${location}`);
            setTagLocations(response.data);
        } catch (error) {
            console.log(error);
        }
    };

    const getEntranceEvents = async () => {
        try {
            const response = await baseAxios.get<PeopleEvent[]>(`/people-counter/entrance/factory`);
            setFactoryEntranceEvents(response.data);
            const response2 = await baseAxios.get<PeopleEvent[]>(`/people-counter/entrance/manufactoring`);
            setManufactoringEntranceEvents(response2.data);
        } catch (error) {
            console.log(error);
        }
    };

    const getExitEvents = async () => {
        try {
            const response = await baseAxios.get<PeopleEvent[]>(`/people-counter/exit/factory`);
            setFactoryExitEvents(response.data);
            const response2 = await baseAxios.get<PeopleEvent[]>(`/people-counter/exit/manufactoring`);
            setManufactoringExitEvents(response2.data);
        } catch (error) {
            console.log(error);
        }
    };

    function drawZones(canvas: HTMLCanvasElement, c: CanvasRenderingContext2D, floorplanWidth: number, floorplanHeight: number) {
        if (!networkZones.length) return;

        for (let i = 0; i < networkZones.length; i++) {
            const zone = networkZones[i];
            c.fillStyle = zone.inclusion ? 'green' : 'red';

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

    const checkAndUpdateTagState = (tagId: string, outOfArea: boolean) => {
        if (tagsOutside[tagId] !== outOfArea) {
            if (outOfArea) {
                toast.error(`Tag ${tagId} has left its area!`, {
                    autoClose: false,
                    toastId: tagId,
                });
            } else {
                toast.dismiss(tagId);
            }

            setTagsOutside(prevState => ({
                ...prevState,
                [tagId]: outOfArea
            }));
        }
    };

    function drawTags(
        canvas: HTMLCanvasElement,
        c: CanvasRenderingContext2D,
        floorplanWidth: number,
        floorplanHeight: number
    ) {
        for (let i = 0; i < tagLocations.length; i++) {
            const tagLocation = tagLocations[i];
            const tagId = tagLocation.tagid;
            const x = canvas.width * (tagLocation.x / floorplanWidth);
            const y = canvas.height - (canvas.height * (tagLocation.y / floorplanHeight));
            const objectSize = canvas.width * (tagLocation.object_size / floorplanWidth);
            const textSize = canvas.height * (tagLocation.object_size / floorplanHeight);

            let outOfArea = false;

            if (networkZones.length !== 0) {
                for (let j = 0; j < networkZones.length; j++) {
                    const networkZone = networkZones[j];
                    if (networkZone.tagid === tagId) {
                        if (networkZone.inclusion && leftInclusionZone(tagLocation.x, tagLocation.y, networkZone)) {
                            outOfArea = true;
                        } else if (!networkZone.inclusion && inExclusionZone(tagLocation.x, tagLocation.y, networkZone)) {
                            outOfArea = true;
                        }
                    }
                }
            }

            checkAndUpdateTagState(tagId, outOfArea);

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
            } else {
                c.fillStyle = 'blue';
            }

            c.fillRect(x, y, objectSize, textSize);
            c.font = "13px Arial";
            c.fillStyle = "Black";
            c.fillText(outOfArea ? `${tagLocation.name} (out of area)` : tagLocation.name, x + 7, y - 7);
        }
    }

    function inExclusionZone(x: number, y: number, zone: Zone) {
        return (
            x > zone.x &&
            x < zone.x + zone.width &&
            y < zone.y &&
            y > zone.y - zone.height
        );
    }

    function leftInclusionZone(x: number, y: number, zone: Zone) {
        const zoneX = parseFloat(zone.x.toFixed(2));
        const zoneY = parseFloat(zone.y.toFixed(2));
        const zoneWidth = parseFloat(zone.width.toFixed(2));
        const zoneHeight = parseFloat(zone.height.toFixed(2));

        return (
            x < zoneX ||
            x > zoneX + zoneWidth ||
            y > zoneY ||
            y < zoneY - zoneHeight
        );
    }

    function setCanvasSize() {
        const canvas = document.querySelector<HTMLCanvasElement>('#dashboard-map-canvas');
        if (!canvas) return;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
    }

    useEffect(() => {
        fetchData();
    }, [location]);

    useEffect(() => {
        const interval = setInterval(() => setTime(Date.now()), 1000);
        getLocations();
        getEntranceEvents();
        getExitEvents();
        return () => {
            clearInterval(interval);
        };
    }, [time]);

    useEffect(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('#dashboard-map-canvas');
        if (!canvas) return;
        const c = canvas.getContext('2d');
        if (!c) return;

        c.clearRect(0, 0, canvas.width, canvas.height);

        if (tagLocations.length > 0 && networkInfo) {
            drawTags(canvas, c, networkInfo.floorplan_width, networkInfo.floorplan_height);
        }

        if (networkInfo) {
            drawZones(canvas, c, networkInfo.floorplan_width, networkInfo.floorplan_height);
        }
    }, [tagLocations, networkInfo, networkZones]);

    useEffect(() => {
        setCanvasSize();
    }, []);

    return (
        <div className="dashboard">
            <ToastContainer />
            <div className='dashboard-boxes'>
                <div className='people-box'>
                    <DataBox
                        factory={factoryEntranceEvents.length}
                        today="1"
                        manufactoring={manufactoringEntranceEvents.length}
                        logo="People"
                    />
                </div>
                <div className='temp-box'>
                    <DataBox
                        factory={factoryExitEvents.length}
                        today="1"
                        manufactoring={manufactoringExitEvents.length}
                        logo="Objects"
                    />
                </div>
                <div className='temp-box2'>
                    <DataBox
                        factory={factoryEntranceEvents.length - factoryExitEvents.length}
                        today="1"
                        manufactoring={manufactoringEntranceEvents.length - manufactoringExitEvents.length}
                        logo="Total"
                    />
                </div>

                <div className='temp-box3'>
                    <DataBox
                        factory='0'
                        today="1"
                        manufactoring="1"
                        logo="Issues"
                    />
                </div>
            </div>

            <div className='dashboard-map-box'>
                <div className='dashboard-map-title'>
                    <h2>{networkInfo ? networkInfo.name : ""}</h2>
                </div>
                <div className={(location === "0x0RT6") ? "dashboard-map-amdc" : (location === "0x9999") ? "dashboard-map-dandenong" : 'dashboard-map-room'}>
                    <canvas id="dashboard-map-canvas"></canvas>
                </div>
            </div>

            <div className='dashboard-accuracy'>
                <div className='accuracy-chart'>
                    <Barchart
                        title='Tag Accuracy'
                        labels={Object.keys(tagAccuracy)}
                        data={Object.values(tagAccuracy)}
                        color='White'
                        outline='white'
                    />
                </div>
                <div className='dashboard-accuracy-info'>
                    <h4>Tag Accuracy</h4>
                    <p>Anchors predicted accuracy at locating the tag</p>
                </div>
            </div>

            <div className='dashboard-activity'>
                <div className='activity-chart'>
                    <Linechart
                        title='Tag Distance'
                        labels={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]}
                        data={location === 'fof' ? fofActivity : location === 'warehouse' ? warehouseActivity : roomActivity}
                        color='White'
                        outline='white'
                    />
                </div>
                <div className='dashboard-activity-info'>
                    <h4>Tag Activity</h4>
                    <p>Module activity during the current week</p>
                </div>
            </div>

            <div className='dashboard-distance'>
                <div className='distance-chart'>
                    <Barchart
                        title='Tag Distance'
                        labels={Object.keys(tagAccuracy)}
                        data={[0]}
                        color='White'
                        outline='white'
                    />
                </div>
                <div className='dashboard-distance-info'>
                    <h4>Distance Travelled</h4>
                    <p>Distance covered by tag today in meters</p>
                </div>
            </div>
        </div>
    );
}