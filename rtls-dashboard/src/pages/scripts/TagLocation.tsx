import '../styles/TagLocation.css'
import baseAxios from "../../BaseAxios";

import { useEffect, useState, useContext } from 'react';
import LocationContext from '../../contexts/LocationContext'

interface Tag {
    tagid: string; // Assuming tagid is a string, modify if different
    name: string;
}

interface TagsMapping {
    [tagid: string]: boolean | string; // This type can hold both selectedTags and tagNames mappings
}

type TagNames = {
    [key: string]: string;
};

export default function TagLocation() {
    const [time, setTime] = useState(Date.now());
    const [selectionChanged, setSelectionChanged] = useState(false)
    const [networkInfo, setNetworkInfo] = useState(null);
    const [tagLocations, setTagLocations] = useState(null)
    const [tagNames, setTagNames] = useState<TagNames>({});
    const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});

    const [anchors, setAnchors] = useState(null)

    const [location, setLocation] = useContext(LocationContext);

    const colorArray: string[] = ['blue', 'green', 'pink', 'orange', 'brown'];

    type TagLocation = {
        x: number;
        y: number;
        tagid: string;
    };

    function drawTags(
        canvas: HTMLCanvasElement, c: CanvasRenderingContext2D, floorplanWidth: number, floorplanHeight: number): void {
        if (!tagLocations || !selectedTags || !colorArray || !tagNames) return;

        for (let i = 0; i < Object.keys(tagLocations).length; i++) {
            const currentTagLocation = tagLocations[i.toString()] as TagLocation;

            if (selectedTags[currentTagLocation.tagid]) {
                c.fillStyle = colorArray[i];
                const xPos = canvas.width * (currentTagLocation.x / floorplanWidth);
                const yPos = canvas.height - (canvas.height * (currentTagLocation.y / floorplanHeight));
                c.fillRect(xPos, yPos, 20, 20);

                c.font = "20px Arial";
                c.fillStyle = "Black";
                c.fillText(tagNames[currentTagLocation.tagid], xPos + 10, yPos - 10);
            }
        }
    }

    function handleCheck(e: React.ChangeEvent<HTMLInputElement>) { // Assuming e.target is an input element
        const newSelectedTags = { ...selectedTags }; // Clone the object to avoid direct mutation
        newSelectedTags[e.target.value] = !selectedTags[e.target.value];
        setSelectionChanged(!selectionChanged);
        setSelectedTags(newSelectedTags);
    }

    interface TagData {
        tagid: string; // or number based on your data type
        name: string;
    }

    const getTagList = async (): Promise<void> => {
        try {
            const response = await baseAxios.get<TagData[]>(`/taglist/${location}`);
            const json = response.data;

            const selectedTagsTemp: Record<string, boolean> = {}; // or Record<number, boolean> if tagid is a number
            const tagNamesTemp: Record<string, string> = {}; // or Record<number, string> if tagid is a number

            for (let i = 0; i < json.length; i++) {
                selectedTagsTemp[json[i].tagid] = false;
                tagNamesTemp[json[i].tagid] = json[i].name;
            }

            setSelectedTags(selectedTagsTemp);
            setTagNames(tagNamesTemp);
        } catch (error) {
            console.error("Error fetching tag list:", error);
        }
    }

    const getNetworkInfo = async () => {
        try {
            const response = await baseAxios.get(`/network-info/${location}`);
            setNetworkInfo(response.data);
        } catch (error) {
            console.error("Error fetching network info:", error);
        }
    }

    const getAnchors = async () => {
        try {
            const response = await baseAxios.get(`/anchor-locations/${location}`);
            setAnchors(response.data);
        } catch (error) {
            console.error("Error fetching anchor locations:", error);
        }
    }

    const getLocations = async () => {
        try {
            const response = await baseAxios.get(`/taglocations/${location}`);
            setTagLocations(response.data);
        } catch (error) {
            console.error("Error fetching tag locations:", error);
        }
    }

    useEffect(() => {
        getNetworkInfo();
    }, [])

    useEffect(() => {
        getLocations();
        const interval = setInterval(() => setTime(Date.now()), 500);
        return () => {
            clearInterval(interval);
        };
    }, [time])

    useEffect(() => {
        getNetworkInfo();
    }, [location])

    useEffect(() => {
        setSelectedTags({})
        getAnchors();
    }, [networkInfo])

    useEffect(() => {
        getTagList();
    }, [anchors])

    useEffect(() => {
        getLocations();
    }, [selectionChanged])

    useEffect(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
        canvas.width = 1600;
        canvas.height = 800;

        var c = canvas.getContext('2d')!;

        if (tagLocations != null && Object.keys(tagLocations).length != 0 && networkInfo != null) {
            drawTags(canvas, c, networkInfo[0]['floorplan_width'], networkInfo[0]['floorplan_height']);
        }

    }, [tagLocations, location, anchors])

    const generateTagList = (): JSX.Element[] => {
        const tagList: JSX.Element[] = [];

        if (tagLocations !== null) {
            for (const tagid of Object.keys(selectedTags)) {
                tagList.push(
                    <div key={tagid} className={selectedTags[tagid] ? "form-element-active" : 'form-element'}>
                        <input
                            className="taglocation-checkbox"
                            type='checkbox'
                            name='tag'
                            value={tagid}
                            id={tagid}
                            onChange={handleCheck}
                        />
                        <label htmlFor={tagid} className='checkbox-label'>
                            <p>{tagNames[tagid]}</p>
                        </label>
                    </div>
                );
            }
        }

        return tagList;
    }

    return (
        <div className="taglocation">
            <div className="taglocation-title">
                <div className='taglocation-title-left'>
                    <h1>Tag Location</h1>
                    <p>Live view of Factory of The Future</p>
                </div>
            </div>

            <div className="taglocation-selector">
                <div className='taglocation-selector-title'>
                    <h2>DWV1001 Modules</h2>
                </div>


                <div className='list'>
                    {generateTagList()}
                </div>
            </div>

            <div className="taglocation-map">
                <div className='map-title'>
                    <h2>{(networkInfo != null) ? networkInfo[0]['name'] : ""}</h2>
                </div>
                <div className={(location === "0x0RT6") ? "dashboard-map-amdc" : (location === "0x1BBA") ? "dashboard-map-warehouse" : 'dashboard-map-room'}>
                    <canvas id="mapCanvas"></canvas>
                </div>

            </div>
        </div>
    )
}