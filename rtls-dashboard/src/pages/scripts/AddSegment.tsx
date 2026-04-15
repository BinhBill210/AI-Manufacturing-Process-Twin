import React, { useContext, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LocationContext from '../../contexts/LocationContext';
import baseAxios from "../../BaseAxios";

import '../styles/AddSegment.css';

interface NetworkInfo {
    floorplan_width: number;
    floorplan_height: number;
    // Add any other fields from your data model here
}

const AddSegment: React.FC = () => {
    const { networkID } = useParams<{ networkID: string }>();
    const [x, setX] = useState<number>(0);
    const [y, setY] = useState<number>(0);
    const [name, setName] = useState<string>("");
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo[] | null>(null);
    const [location, setLocation] = useContext(LocationContext);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);

    const navigate = useNavigate();

    function drawSegment(canvas: HTMLCanvasElement, c: CanvasRenderingContext2D, floorplanWidth: number, floorplanHeight: number) {
        c.fillStyle = 'red';
        c.save();
        c.globalAlpha = 0.3;
        c.fillRect(canvas.width * (x / floorplanWidth), canvas.height - (canvas.height * (y / floorplanHeight)),
            canvas.width * (width / floorplanWidth), canvas.height * (height / floorplanHeight));
        c.restore();
    }

    function updateSegmentDisplay() {
        const nameInput = document.getElementById('name-input') as HTMLInputElement;
        const xInput = document.getElementById('x-input') as HTMLInputElement;
        const yInput = document.getElementById('y-input') as HTMLInputElement;
        const widthInput = document.getElementById('width-input') as HTMLInputElement;
        const heightInput = document.getElementById('height-input') as HTMLInputElement;

        if (nameInput && xInput && yInput && widthInput && heightInput) {
            setName(nameInput.value);
            setX(Number(xInput.value));
            setY(Number(yInput.value));
            setWidth(Number(widthInput.value));
            setHeight(Number(heightInput.value));
        }
    }

    const getNetworkInfo = async (): Promise<void> => {
        try {
            const response = await baseAxios.get(`/network-info/${location}`);
            setNetworkInfo(response.data);
        } catch (error) {
            console.error("Error fetching network info:", error);
        }
    }

    useEffect(() => {
        getNetworkInfo();
    }, [location]);

    const addSegment = async () => {
        try {
            await baseAxios.post(`/add-network-segment`, {
                networkID: location,
                name: name,
                x: x,
                y: y,
                width: width,
                height: height
            });
            navigate(`/editnetwork/${location}`);
        } catch (error) {
            console.error('Error adding segment:', error);
        }
    };

    useEffect(() => {
        const canvas = document.querySelector('canvas');
        if (canvas) {
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;

            const c = canvas.getContext('2d');
            if (c && networkInfo) {
                drawSegment(canvas, c, networkInfo[0]['floorplan_width'], networkInfo[0]['floorplan_height']);
            }
        }
    }, [x, y, width, height]);



    return (
        <div className="add-segment">
            <div className='add-segment-header'>
                <h1>Add Segment</h1>
            </div>
            <div className={(location === "0x0RT6") ? "add-segment-map-0x0RT6" : (location === "0x1BBA") ? "add-segment-map-0x1BBA" : "add-segment-map-0x0499"}>
                <canvas id='add-segment-canvas'></canvas>
            </div>
            <div className='add-segment-details'>
                <p className="add-segment-label">X Pos: </p>
                <input type='text' className="add-segment-item" id="x-input" onChange={() => updateSegmentDisplay()}></input>
                <p className="add-segment-label">Y Pos: </p>
                <input type='text' className="add-segment-item" id="y-input" onChange={() => updateSegmentDisplay()}></input>
                <p className="add-segment-label">Width: </p>
                <input type='text' className="add-segment-item" id="width-input" onChange={() => updateSegmentDisplay()}></input>
                <p className="add-segment-label">Height: </p>
                <input type='text' className="add-segment-item" id="height-input" onChange={() => updateSegmentDisplay()}></input>
                <p className="add-segment-label">Name: </p>
                <input type='text' className="add-segment-item" id="name-input" onChange={() => updateSegmentDisplay()}></input>
                <button className='add-segment-btn' onClick={(e) => addSegment()}>Add Segment</button>
            </div>
        </div>
    )
}

export default AddSegment;