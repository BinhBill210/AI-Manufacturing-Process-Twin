import { useContext, useEffect, useState, ChangeEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LocationContext from '../../contexts/LocationContext';
import baseAxios from "../../BaseAxios";
import '../styles/AddZone.css'

interface NetworkInfo {
    // Add properties as needed, for now, it's assumed as any object
    [key: string]: any;
}

interface Params {
    networkID: string;
}

export default function AddZone() {
    const [x, setX] = useState<number>(0);
    const [y, setY] = useState<number>(0);
    const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
    const [location, setLocation] = useContext(LocationContext);
    const [width, setWidth] = useState<number>(0);
    const [height, setHeight] = useState<number>(0);
    const [name, setName] = useState<string>("");
    const [tagId, setTagId] = useState<string>("");
    const [isInclusion, setIsInclusion] = useState<boolean>(false);

    const navigate = useNavigate();

    const drawZone = (canvas: HTMLCanvasElement, c: CanvasRenderingContext2D, floorplanWidth: number, floorplanHeight: number) => {
        c.fillStyle = 'red';
        c.save();
        c.globalAlpha = 0.3;
        c.fillRect(
            canvas.width * (x / floorplanWidth),
            canvas.height - (canvas.height * (y / floorplanHeight)),
            canvas.width * (width / floorplanWidth),
            canvas.height * (height / floorplanHeight)
        );
        c.restore();
    };

    const getNetworkInfo = async () => {
        try {
            const response = await baseAxios.get<NetworkInfo>(`/network-info/${location}`);
            setNetworkInfo(response.data);
        } catch (error) {
            console.error("An error occurred while fetching network info:", error);
        }
    };

    useEffect(() => {
        getNetworkInfo();
    }, [location]);

    const addZone = async () => {
        if (width === 0 || height === 0) {
            alert('Height or width can\'t be 0');
            return;
        }

        const type = isInclusion ? 'inclusion' : 'exclusion';

        try {
            const response = await baseAxios.post(`/add-network-zone`, {
                networkID: location,
                tagID: tagId,
                name,
                x,
                y,
                width,
                height,
                type
            });

            if (response.status !== 200) {
                throw new Error("Failed to add zone");
            }

            navigate('/dashboard');
        } catch (error) {
            console.error("An error occurred while adding zone:", error);
        }
    };

    useEffect(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        const c = canvas.getContext('2d')!;

        if (networkInfo !== null) {
            drawZone(canvas, c, 62, 40);
        }
    }, [x, y, width, height, networkInfo]);

    return (
        <div className="add-zone">
            <div className='add-zone-header'>
                <h1>Add zone</h1>
            </div>
            <div className={location === "0x0RT6" ? "add-zone-map-0x0RT6" : (location === "0x1BBA" ? "add-zone-map-0x1BBA" : "add-zone-map-0x0499")}>
                <canvas id='add-zone-canvas'></canvas>
            </div>
            <div className='add-zone-details'>
                <label className="add-zone-label">Tag ID:</label>
                <input type='text' value={tagId} onChange={(e: ChangeEvent<HTMLInputElement>) => setTagId(e.target.value)} className="add-zone-item"></input>

                <label className="add-zone-label">X:</label>
                <input type='number' value={x} onChange={(e: ChangeEvent<HTMLInputElement>) => setX(+e.target.value)} className="add-zone-item"></input>

                <label className="add-zone-label">Y:</label>
                <input type='number' value={y} onChange={(e: ChangeEvent<HTMLInputElement>) => setY(+e.target.value)} className="add-zone-item"></input>

                <label className="add-zone-label">Width:</label>
                <input type='number' value={width} onChange={(e: ChangeEvent<HTMLInputElement>) => setWidth(+e.target.value)} className="add-zone-item"></input>

                <label className="add-zone-label">Height:</label>
                <input type='number' value={height} onChange={(e: ChangeEvent<HTMLInputElement>) => setHeight(+e.target.value)} className="add-zone-item"></input>

                <label className="add-zone-label">Name:</label>
                <input type='text' value={name} onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)} className="add-zone-item"></input>

                <label className="add-zone-label">Inclusion:</label>
                <input type='checkbox' checked={isInclusion} onChange={(e: ChangeEvent<HTMLInputElement>) => setIsInclusion(e.target.checked)} className="add-zone-item"></input>

                <button className='add-zone-btn' onClick={addZone}>Add</button>
            </div>
        </div>
    );
}