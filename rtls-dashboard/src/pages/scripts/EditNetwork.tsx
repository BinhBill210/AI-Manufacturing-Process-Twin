import { useContext, useEffect, useState } from 'react';
import '../styles/EditNetwork.css'
import { useNavigate, useParams } from 'react-router-dom';
import LocationContext from '../../contexts/LocationContext';
import baseAxios from "../../BaseAxios";


export default function EditNetwork() {
    var { networkID } = useParams()
    const [anchors, setAnchors] = useState(null)
    const [tags, setTags] = useState(null)
    const [networkInfo, setNetworkInfo] = useState(null)
    const [networkSegments, setNetworkSegments] = useState(null)
    const [deleted, setDeleted] = useState(null)
    const [location, setLocation] = useContext(LocationContext);

    const navigate = useNavigate()

    function addSegment() {
        var link = '/addsegment/'
        navigate(link)
    }

    function addZone() {
        var link = '/addzone/'
        navigate(link)
    }

    async function fetchData() {
        try {
            const [networkInfoData, networkSegmentData, anchorListData, tagListData] = await Promise.all([
                baseAxios.get(`/network-info/${location}`),
                baseAxios.get(`/network-segments/${location}`),
                baseAxios.get(`/anchorlist/${location}`),
                baseAxios.get(`/taglist/${location}`)
            ]);

            setNetworkInfo(networkInfoData.data);
            setNetworkSegments(networkSegmentData.data);
            setAnchors(anchorListData.data);
            setTags(tagListData.data);

        } catch (error) {
            console.log(error);
        }
    }

    const deleteSegment = async (segmentID: number) => {
        try {
            await baseAxios.delete(`/network-segment/${segmentID}`);
            fetchData(); // This will fetch the data again
        } catch (error) {
            console.error('Error deleting segment:', error);
        }
    };

    function createNotification(id: string, newName: string, size: string) {
        var name = 'Tag Re-Assigned'
        var description = `Tag ${id} Updated - Name: "${newName}" Size: ${size}`
        var type = 'Re-Assignment'
        const data = {
            networkID: location,
            name: name,
            description: description,
            type: type
        };

        const response = baseAxios.post(`/create-notification`, data);
    }

    const updateTag = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
        const id = e.currentTarget.value;  // Note: Changed from e.target to e.currentTarget

        const tagidElement = document.getElementById(`${id}-h3`) as HTMLElement | null;
        const nameElement = document.getElementById(`${id}-input`) as HTMLInputElement | null;
        const sizeElement = document.getElementById(`${id}-size-input`) as HTMLInputElement | null;

        if (!tagidElement || !nameElement || !sizeElement) {
            console.error("One or more elements are missing.");
            return;
        }

        const tagid = tagidElement.textContent;
        const name = nameElement.value;
        const size = sizeElement.value;

        createNotification(id, name, size);
        const response = await baseAxios.put(`/update-tag`, {
            tagid,
            name,
            size
        });
    }

    function drawSegments(canvas: HTMLCanvasElement, c: CanvasRenderingContext2D, floorplanWidth: number, floorplanHeight: number) {
        if (networkSegments) {
            for (var i = 0; i < Object.keys(networkSegments).length; i++) {
                c.fillStyle = 'red'
                c.save();
                c.globalAlpha = 0.3;
                c.fillRect(canvas.width * (networkSegments[i.toString()]["segment_x"] / floorplanWidth), canvas.height - (canvas.height * (networkSegments[i.toString()]["segment_y"] / floorplanHeight)),
                    canvas.width * (networkSegments[i.toString()]["width"] / floorplanWidth), canvas.height * (networkSegments[i.toString()]["height"] / floorplanHeight));
                c.restore()
            }
        }
    }

    useEffect(() => {
        fetchData();
    }, [location])

    useEffect(() => {
        const canvas = document.querySelector<HTMLCanvasElement>('canvas')!;
        canvas.style.width = '100%';
        canvas.style.height = '99%';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        var c = canvas.getContext('2d')!;

        if (networkInfo != null && networkSegments != null) {
            drawSegments(canvas, c, networkInfo[0]['floorplan_width'], networkInfo[0]['floorplan_height']);
        }

    }, [tags])

    function generateSegmentList() {
        if (!networkSegments) return [];

        return Object.keys(networkSegments).map(index => {
            const segment = networkSegments[index];
            const { name, segment_x, segment_y, width, height, id } = segment;

            return (
                <li key={name} className='segment-list-item'>
                    <h3 className='segment-name'>{name}</h3>
                    <p className='segment-x'>X: {segment_x}</p>
                    <p className='segment-y'>Y: {segment_y}</p>
                    <p className='segment-width'>Width: {width}m</p>
                    <p className='segment-height'>Height: {height}m</p>
                    <div className='delete-segment'>
                        <button className='delete-segment-btn' value={id} onClick={() => deleteSegment(id)}>Delete</button>
                    </div>
                </li>
            );
        });
    }

    function generateAnchorList() {
        var anchorList = [];

        if (anchors != null) {
            for (var i = 0; i < Object.keys(anchors).length; i++) {
                anchorList.push(
                    <li key={anchors[i.toString()]['anchorid']} className='anchor-list-item'>
                        <h3 className='anchor-id'>{anchors[i.toString()]['anchorid']}</h3>
                        <p className='anchor-name'>{anchors[i.toString()]['name']}</p>
                        <p className='anchor-x'>X: {anchors[i.toString()]['x']}</p>
                        <p className='anchor-y'>Y: {anchors[i.toString()]['y']}</p>
                        <p className='anchor-z'>Z: {anchors[i.toString()]['z']}</p>
                        <p className='anchor-initiator'>{(anchors[i.toString()]['initiator']) ? "Initiator" : ""}</p>
                    </li>
                )
            }
        }
        return anchorList;
    }

    function generateTagList() {
        var tagList = [];

        if (tags != null) {
            var tagid
            for (var i = 0; i < Object.keys(tags).length; i++) {
                tagid = tags[i.toString()]['tagid']
                tagList.push(
                    <li key={tags[i.toString()]['tagid']} className='tag-list-item'>
                        <h3 className='tag-id' id={tagid + '-h3'}>{tags[i.toString()]['tagid']}</h3>
                        <input type='text' className='tag-name' id={tagid + '-input'} defaultValue={tags[i.toString()]['name']} />
                        <input type='text' className='tag-size' id={tagid + '-size-input'} defaultValue={tags[i.toString()]['object_size']} />
                        <p className='n-update-rate'>N Rate: {tags[i.toString()]['normal_update_rate']}s</p>
                        <p className='s-update-rate'>S Rate: {tags[i.toString()]['stationary_update_rate']}s</p>
                        <div className='update-tag'>
                            <button className='update-tag-btn' value={tagid} onClick={(e) => updateTag(e)}>Save</button>
                        </div>

                    </li>
                )
            }
        }
        return tagList;
    }

    function updateNetworkInfo() {
        const networkIDElement = document.getElementById('info-network-input') as HTMLInputElement | null;
        const nameElement = document.getElementById('info-name-input') as HTMLInputElement | null;
        const filenameElement = document.getElementById('info-floorplan-input') as HTMLInputElement | null;
        const xElement = document.getElementById('info-floorplan-x-input') as HTMLInputElement | null;
        const yElement = document.getElementById('info-floorplan-y-input') as HTMLInputElement | null;

        if (!networkIDElement || !nameElement || !filenameElement || !xElement || !yElement) {
            console.error("One or more input elements are missing.");
            return;
        }

        const networkID = networkIDElement.value;
        const name = nameElement.value;
        const filename = filenameElement.value;
        const x = xElement.value;
        const y = yElement.value;

        const response = baseAxios.get(`/update-network-info/${networkID}/${name}/${filename}/${x}/${y}`);  // Assuming you meant to use .get method here.
    }

    return (
        <div className="edit-network">
            <div className='edit-network-info'>
                <div className='info-header'>
                    <h2>Information</h2>
                </div>

                <div className='info-name'>
                    <p id="info-name-label">Network Name</p>
                    <input id="info-name-input" defaultValue={(networkInfo != null) ? networkInfo['0']['name'] : ""}></input>
                </div>

                <div className='info-network'>
                    <p id="info-network-label">Network ID</p>
                    <input id="info-network-input" defaultValue={(networkInfo != null) ? networkInfo['0']['networkid'] : ""}></input>
                </div>

                <div className='info-floorplan-file'>
                    <p id="info-floorplan-label">Floorplan File</p>
                    <input id="info-floorplan-input" defaultValue={(networkInfo != null) ? networkInfo['0']['floorplan_filename'] : ""}></input>
                </div>

                <div className='info-floorplan-x'>
                    <p id="info-floorplan-x-label">Floorplan X</p>
                    <input id="info-floorplan-x-input" defaultValue={(networkInfo != null) ? networkInfo['0']['floorplan_width'] : ""}></input>
                </div>

                <div className='info-floorplan-y'>
                    <p id="info-floorplan-y-label">Floorplan Y</p>
                    <input id="info-floorplan-y-input" defaultValue={(networkInfo != null) ? networkInfo['0']['floorplan_height'] : ""}></input>
                </div>

                <div className='info-update'>
                    <button className='info-update-btn' onClick={() => updateNetworkInfo()}>Save</button>
                </div>
            </div>

            <div className='edit-network-map'>
                <div className={(location === "0x0RT6") ? "network-map-0x0RT6" : (location === "0x1BBA") ? "network-map-0x1BBA" : 'network-map-0x0499'}>
                    <canvas id="mapCanvas"></canvas>
                </div>
            </div>

            <div className='edit-network-segments'>
                <div className='network-segments-title'>
                    <h2>Network Segments</h2>
                </div>

                <div className='network-segments-content'>
                    <ul className='network-segments-list'>
                        {generateSegmentList()}
                        <li className='segment-list-new'>
                            <button className='new-segment-button' onClick={() => addSegment()}>Add Segment</button>
                        </li>
                    </ul>
                </div>

            </div>

            <div className='edit-network-anchors'>
                <div className='edit-anchors-title'>
                    <h2>Anchors</h2>
                </div>

                <div className='edit-anchors-content'>
                    <ul className='edit-anchors-list'>
                        {generateAnchorList()}
                    </ul>
                </div>
            </div>

            <div className='edit-network-tags'>
                <div className='edit-tags-title'>
                    <h2>Tags</h2>
                </div>

                <div className='edit-tags-content'>
                    <ul className='edit-tags-list'>
                        {generateTagList()}
                    </ul>
                    <div className='add-new-zone'>
                        <button className='add-zone-button' onClick={() => addZone()}>Add New Zone</button>
                    </div>
                </div>
            </div>
        </div>
    )
}