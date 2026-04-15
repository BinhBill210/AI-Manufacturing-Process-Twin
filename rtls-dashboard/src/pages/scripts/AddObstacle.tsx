import React, { useRef, useContext, useEffect, useState,  } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LocationContext from '../../contexts/LocationContext';
import baseAxios from "../../BaseAxios";
import '../styles/DrawRectangle.css';
import '../styles/AddSegment.css';

interface NetworkInfo {
    floorplan_width: number;
    floorplan_height: number;
}

const AddObstacle: React.FC = () => {
    const { networkID } = useParams<{ networkID: string }>();
    const [x, setX] = useState<number>(0);
    const [y, setY] = useState<number>(0);
    const [name, setName] = useState<string>("");
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo[] | null>(null);
    const [location, setLocation] = useContext(LocationContext);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [tagId, setTagId]=useState<string>("");
    const navigate = useNavigate();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startX, setStartX] = useState<number | null>(null);
    const [startY, setStartY] = useState<number | null>(null);
    const [rectWidth, setRectWidth] = useState<number | null>(null);
    const [rectHeight, setRectHeight] = useState<number | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) return;

        canvas.width = 500;
        canvas.height = 500;
        context.lineCap = "round";
        context.strokeStyle = "black";
        context.lineWidth = 5;
    }, []);


    //function for starting the drawing of the rectangle
    const startDrawingRectangle = (event: React.MouseEvent<HTMLCanvasElement>) => {      
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left);
        const y = (rect.bottom - event.clientY);

        setIsDrawing(true);
        setStartX(x);
        setStartY(y);
        
            const canvas = document.getElementById('canvas') as HTMLCanvasElement;
            const canvasWidth = canvas.offsetWidth; // Width of the canvas element, including padding and border
            const canvasHeight = canvas.offsetHeight; // Height of the canvas element, including padding and border
            
            const xc: number = 62 * x / canvasWidth;
            const yc: number = 40 * y / canvasHeight;
            
            const roundedXc: number = +xc.toFixed(2); // Round to 2 decimal places
            const roundedYc: number = +yc.toFixed(2); // Round to 2 decimal places
            
            setX(roundedXc);
            setY(roundedYc);
    };

    //function for drawing the rectangle
    const drawRectangle = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !startX || !startY) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left);
        const y = (rect.bottom - event.clientY);

        setRectWidth(x - startX);
        setRectHeight(startY - y);

        const canvas2 = document.getElementById('canvas') as HTMLCanvasElement;
        const canvasWidth = canvas2.width; // Width of the canvas element, including padding and border
        const canvasHeight = canvas2.height; // Height of the canvas element, including padding and border
        
        if (rectWidth && rectHeight) {
            const w = (62 * rectWidth / canvasWidth);
            const h = (40 * rectHeight / canvasHeight);
        
            // const roundedWidth = w.toFixed(2);
            // const roundedHeight = h.toFixed(2);    
            // setWidth(parseFloat(roundedWidth));
            // setHeight(parseFloat(roundedHeight));

            setWidth(Math.ceil(w))
            setHeight(Math.ceil(h))
        }
        
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        if (!canvas) return;
        
        const context = canvas.getContext("2d");
        if (!context) return;
    
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = '#ADD8E6'; // Set stroke color
        context.fillStyle = 'rgba(173, 216, 230, 0.5)' // Set fill color
        context.beginPath();
        context.rect(startX, canvas.height - startY, x - startX, startY - y); // Adjusted for bottom-left corner origin
        context.fill(); // Fill the rectangle
        context.stroke(); // Draw the border
    };
    //function to check if drawing is stopped
    const stopDrawingRectangle = () => {
        setIsDrawing(false);
    };
    
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
        const tagIdInput = document.getElementById('id-input') as HTMLInputElement;

        if (nameInput && tagIdInput) {
            setName(nameInput.value);
            setTagId(tagIdInput.value);
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

    //Adding obstacles to database
    const addSegment = async () => {
        try {
            await baseAxios.post(`/add-obstacle`, {
                tagId: tagId,
                networkID: location,
                name: name,
                x: x,
                y: y,
                width: width,
                height: height
            });
            navigate(`/collision`);
        } catch (error) {
            console.error('Error adding obstacles:', error);
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

        }
    }, [x, y, width, height]);



    return (
        <div className="add-segment">
            <div className='add-segment-header'>
                <h1>Add Obstacle</h1>
            </div>
            <div className={(location === "0x0RT6") ? "add-segment-map-0x0RT6" : (location === "0x1BBA") ? "add-segment-map-0x1BBA" : "add-segment-map-0x0499"}>
                <canvas id="canvas"                 className="canvas-container-rect"
                ref={canvasRef}
                onMouseDown={startDrawingRectangle}
                onMouseMove={drawRectangle}
                onMouseUp={stopDrawingRectangle}
                onMouseLeave={stopDrawingRectangle}></canvas>
            </div>
            <div className='add-segment-details'>
            <p className="add-segment-label">Tag Id: </p>
                <input type='text' className="add-segment-item" id="id-input" onChange={() => updateSegmentDisplay()}></input>
                <p className="add-segment-label">X Pos: </p>
                <div className="add-segment-item" id="x-input">{x}</div> 
                <p className="add-segment-label">Y Pos: </p>
                <div className="add-segment-item" id="y-input">{y}</div>
                <p className="add-segment-label">Width: </p>
                <div className="add-segment-item" id="width-input">{width}</div>
                <p className="add-segment-label">Height: </p>
                <div className="add-segment-item" id="height-input">{height}</div>
                
                <p className="add-segment-label">Name: </p>
                <input type='text' className="add-segment-item" id="name-input" onChange={() => updateSegmentDisplay()}></input>
                <button className='add-segment-btn' onClick={(e) => addSegment()}>Add Obsctacle</button>
            </div>
        </div>
    )
}

export default AddObstacle;