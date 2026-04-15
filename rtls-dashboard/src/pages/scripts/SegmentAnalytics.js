import { useEffect, useState, React, useContext } from 'react';
import baseAxios from "../../BaseAxios";
import LocationContext from '../../contexts/LocationContext';
import '../styles/SegmentAnalytics.css'
import Barchart from '../../components/charts/scripts/Barchart'
import { DataGrid } from '@mui/x-data-grid';
import LineChart from '../../components/charts/scripts/Linechart';

export default function SegmentAnalytics() {
    const [location, setLocation] = useContext(LocationContext);
    const [title, setTitle] = useState('Segment Comparison')
    const [networkInfo, setNetworkInfo] = useState(null);
    const [networkSegments, setNetworkSegments] = useState(null)
    const [selectedSegment, setSelectedSegment] = useState("none")
    const [selectedTag, setSelectedTag] = useState("none")
    const [tagNames, setTagNames] = useState(null)

    const [selectedTags, setSelectedTags] = useState({
    })

    var data = {
        'segmentdata': {
            '3D Printing': [168, 10, 40, 30, 40, 1, 60, 30],
            'Dome': [0, 1, 60, 85, 30, 3, 20, 25],
            'Design And Testing': [0, 150, 12, 30, 60, 160, 25, 43]
        },

        'segmentactivity': {
            '3D Printing': [34, 95, 90, 88, 92, 83, 22],
            'Dome': [45, 88, 92, 84, 84, 91, 12],
            'Design And Testing': [42, 91, 90, 84, 82, 93, 42]
        },

        'tagdata': {
            'breakdown': {
                '0xAAAA': [2, 5, 30],
                '0xAAAB': [5, 40, 5],
                '0xAAAC': [168, 0, 0],
                '0xAAAD': [5, 1, 162],
                '0xAAAE': [35, 32, 60]
            },
            '3D Printing': {
                '0xAAAA': [0, 0, 1, 4, 3, 2, 0],
                '0xAAAB': [3, 4, 5, 2, 3, 1, 0],
                '0xAAAC': [24, 24, 24, 24, 24, 24, 24],
                '0xAAAD': [0, 0, 2, 1, 0, 2, 1],
                '0xAAAE': [8, 24, 2, 0, 0, 0, 4]
            },
            'Dome': {
                '0xAAAA': [0, 2, 1, 1, 0, 0, 0],
                '0xAAAB': [6, 8, 8, 6, 4, 7, 0],
                '0xAAAC': [0, 0, 0, 0, 0, 0, 0],
                '0xAAAD': [0, 0, 1, 0, 0, 1, 0],
                '0xAAAE': [3, 0, 5, 22, 0, 0, 4]
            },
            'Design And Testing': {
                '0xAAAA': [0, 6, 7, 4, 0, 6, 0],
                '0xAAAB': [0, 2, 3, 6, 1, 1, 0],
                '0xAAAC': [0, 0, 0, 0, 0, 0, 0],
                '0xAAAD': [24, 24, 22, 23, 24, 22],
                '0xAAAE': [3, 0, 0, 2, 24, 24, 4]
            }
        }
    }



    function getMousePos(canvas, evt) {
        var rect = canvas.getBoundingClientRect();
        var x = (((evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width) / canvas.width) * networkInfo[0]['floorplan_width']
        var y = (((evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height) / canvas.height) * networkInfo[0]['floorplan_height']

        for (var i = 0; i < Object.keys(networkSegments).length; i++) {
            inNetworkSegment(x, networkInfo[0]['floorplan_height'] - y, networkSegments[i])
        }

        inNetworkSegment(x, y, networkSegments[1])
        return {
            x: (evt.clientX - rect.left) / (rect.right - rect.left) * canvas.width,
            y: (evt.clientY - rect.top) / (rect.bottom - rect.top) * canvas.height

        };
    }

    function handleCheck(e) {
        setSelectedSegment("none")
        if (selectedTag != e.target.value) {
            setSelectedTag(e.target.value);
        } else {
            setSelectedTag("none")
        }

    }

    function drawSegments(canvas, c, floorplanWidth, floorplanHeight) {
        c.clearRect(0, 0, canvas.width, canvas.height);

        for (var i = 0; i < Object.keys(networkSegments).length; i++) {
            if (networkSegments[i]['name'] == selectedSegment) {
                c.fillStyle = 'orange'
            } else {
                c.fillStyle = 'red'
            }

            c.save();
            c.globalAlpha = 0.3;
            c.fillRect(canvas.width * (networkSegments[i]["segment_x"] / floorplanWidth), canvas.height - (canvas.height * (networkSegments[i]["segment_y"] / floorplanHeight)),
                canvas.width * (networkSegments[i]["width"] / floorplanWidth), canvas.height * (networkSegments[i]["height"] / floorplanHeight));
            c.restore()
        }
    }

    function inNetworkSegment(x, y, segment) {
        if (((x > segment['segment_x']) && x < (segment["segment_x"] + segment['width']) && y < segment['segment_y']) && y > (segment["segment_y"] - segment['height'])) {
            if (selectedSegment == segment['name']) {
                setSelectedSegment('none')
                setSelectedTag("none")
                setTitle('Segment Comparison')
            } else {
                setSelectedTag("none")
                setSelectedSegment(segment['name'])
                setTitle(segment['name'])
            }

        } else {
            console.log("no")
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

    const getNetworkSegments = async () => {
        try {
            const response = await baseAxios.get(`/network-segments/${location}`);
            setNetworkSegments(response.data);
        } catch (error) {
            console.error("Error fetching network segments:", error);
        }
    }

    const getTagList = async () => {
        try {
            const response = await baseAxios.get(`/taglist/${location}`);
            const json = response.data;

            const selectedTagsTemp = {};
            const tagNamesTemp = {};

            for (let i = 0; i < json.length; i++) {
                selectedTagsTemp[json[i]['tagid']] = false;
                tagNamesTemp[json[i]['tagid']] = json[i]['name'];
            }

            setSelectedTags(selectedTagsTemp);
            setTagNames(tagNamesTemp);
        } catch (error) {
            console.error("Error fetching tag list:", error);
        }
    }

    useEffect(() => {
        getNetworkInfo()
    }, [])

    useEffect(() => {
        getNetworkSegments()

        var canvas = document.querySelector('canvas');
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;

        var c = canvas.getContext('2d');

        if (networkInfo != null && networkSegments != null) {
            drawSegments(canvas, c, networkInfo[0]['floorplan_width'], networkInfo[0]['floorplan_height']);
        }

    }, [networkInfo])

    useEffect(() => {
        getTagList()
    }, [networkSegments])

    useEffect(() => {
        var canvas = document.querySelector('canvas');
        var c = canvas.getContext('2d');

        if (networkInfo != null && networkSegments != null) {
            drawSegments(canvas, c, networkInfo[0]['floorplan_width'], networkInfo[0]['floorplan_height']);
        }

    }, [selectedSegment])

    function generateTagList() {
        var tagList = [];

        if (selectedTags != null) {
            var tagid;
            for (var i = 0; i < Object.keys(selectedTags).length; i++) {
                tagid = Object.keys(selectedTags)[i];
                tagList.push(<div key={tagid} className={(selectedTag == tagid) ? "segment-form-element-active" : 'segment-form-element'}>
                    <input className="segment-taglocation-checkbox" type='checkbox' name='tag' value={tagid} id={tagid} onChange={(e) => handleCheck(e)}></input>
                    <label htmlFor={tagid} className='segment-checkbox-label'>
                        <p>{tagNames[tagid]}</p>
                    </label>
                </div>)
            }
        }

        return tagList;
    }


    function infoTable() {
        const columns = [
            { field: 'id', headerName: 'ID', flex: 1 },
            { field: 'name', headerName: 'Name', flex: 1 },
            { field: 'issue', headerName: 'Issue', flex: 2 },
            { field: 'time', headerName: 'Time', flex: 1 }
        ];

        var data = [
            {
                'name': 'Dome',
                'issue': 'Robot entered zone',
                'time': '12:32pm Feb 8th'
            },
            {
                'name': 'Dome',
                'issue': 'Robot entered zone',
                'time': '5:38pm Feb 6th'
            },
            {
                'name': '3D Printing',
                'issue': 'First Aid Entered Zone',
                'time': '10:42am Feb 5th'
            },
            {
                'name': 'Dome',
                'issue': 'First Aid Entered Zone',
                'time': '10:42am Feb 5th'
            },
            {
                'name': 'Design And Testing',
                'issue': 'First Aid Left Zone',
                'time': '10:41am Feb 5th'
            },
            {
                'name': 'Dome',
                'issue': 'Robot entered zone',
                'time': '8:47pm Feb 4th'
            },
            {
                'name': '3D Printing',
                'issue': 'Robot entered zone',
                'time': '3:55pm Feb 3rd'
            },
            {
                'name': 'Dome',
                'issue': 'Robot entered zone',
                'time': '3:53pm Feb 3rd'
            },



        ]
        var rows = []

        for (var i = 0; i < data.length; i++) {
            rows.push({
                id: i, name: data[i].name,
                issue: data[i].issue,
                time: data[i]['time']
            })
        }


        return (
            <div className="info-table">
                <div style={{ height: '100%', width: '100%', marginLeft: '0px' }}>
                    <DataGrid
                        rows={rows}
                        rowHeight={70}
                        columns={columns}
                        pageSize={10}
                        title={'Recent Issues'}
                        rowsPerPageOptions={[10]}
                    />
                </div>
            </div>
        )
    }

    function generateComparisonContent() {
        return (
            <div className='segment-analytics-content'>
                <div className='segment-activity'>
                    <div className='segment-activity-chart'>
                        <Barchart title='Segment activity' labels={['3D Printing', 'Dome', 'Design / testing']}
                            data={[50, 15, 35]} color='White' outline='white' />
                    </div>
                    <div className='segment-activity-info'>
                        <h4>Segment Activity</h4>
                        <p>Total Assets activity by segment (Totals 100%)</p>
                    </div>
                </div>

                <div className='segment-activity2'>
                    <div className='segment-activity-chart2'>
                        <LineChart title='Segment activity' labels={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
                            data={[0, 1, 2, 2, 1, 3, 0]} color='White' outline='white' max={5} />
                    </div>
                    <div className='segment-activity-info2'>
                        <h4>Segment Violations</h4>
                        <p>Total Issues by Day of Week</p>
                    </div>
                </div>

                <div className='segment-tags'>
                    <div className='segment-tags-chart'>
                        <Barchart title='Segment activity' labels={['3D Printing', 'Dome', 'Design / testing']}
                            data={[12, 3, 8]} color='White' outline='white' max={15} />
                    </div>
                    <div className='segment-tags-info'>
                        <h4>Assets In Segment</h4>
                        <p>Number of assets within segment this week</p>
                    </div>
                </div>

                <div className='info-table'>
                    {infoTable()}
                </div>
            </div>
        )
    }


    function generateViewSegmentContent() {
        return (
            <div className='view-segment-content'>
                <div className='segment-timespent'>
                    <div className='segment-timespent-chart'>
                        <Barchart title='Segment activity' labels={['3D Priner', 'Robot', 'Person 1', 'Laptop', 'Person 2', 'First Aid', 'Hammer', 'Person 3']}
                            data={data['segmentdata'][selectedSegment]} color='White' outline='white' max={15} />
                    </div>
                    <div className='segment-timespent-info'>
                        <h4>Tags in segment</h4>
                        <p>Time spent by tags in segment this week</p>
                    </div>
                </div>

                <div className='segment-weekly'>
                    <div className='segment-weekly-chart'>
                        <Barchart title='Segment activity' labels={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
                            data={data['segmentactivity'][selectedSegment]} color='White' outline='white' max={15} />
                    </div>
                    <div className='segment-weekly-info'>
                        <h4>Segment Activity</h4>
                        <p>Segment Activity by day of the week</p>
                    </div>
                </div>

            </div>
        )
    }

    function generateTagContent() {
        return (
            <div className='view-tag-content'>
                <div className='tag-segment-timespent'>
                    <div className='tag-segment-timespent-chart'>
                        <Barchart title='Segment activity' labels={['3D Printing', 'Dome', 'Design and Testing']}
                            data={data['tagdata']['breakdown'][selectedTag]} color='White' outline='white' max={15} />
                    </div>
                    <div className='tag-segment-timespent-info'>
                        <h4>Segment Breakdown</h4>
                        <p>Amount of time tag spent in each segment</p>
                    </div>
                </div>

                <div className='tag-printing-timespent'>
                    <div className='tag-printing-timespent-chart'>
                        <Barchart title='Segment activity' labels={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
                            data={data['tagdata']['3D Printing'][selectedTag]} color='White' outline='white' max={15} />
                    </div>
                    <div className='tag-printing-timespent-info'>
                        <h4>3D Printing</h4>
                        <p>Time spent in 3D printing each day</p>
                    </div>
                </div>

                <div className='tag-dome-timespent'>
                    <div className='tag-dome-timespent-chart'>
                        <Barchart title='Segment activity' labels={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
                            data={data['tagdata']['Dome'][selectedTag]} color='White' outline='white' max={15} />
                    </div>
                    <div className='tag-dome-timespent-info'>
                        <h4>Dome</h4>
                        <p>Time spent in Dome each day</p>
                    </div>
                </div>

                <div className='tag-design-timespent'>
                    <div className='tag-design-timespent-chart'>
                        <Barchart title='Segment activity' labels={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
                            data={data['tagdata']['Design And Testing'][selectedTag]} color='White' outline='white' max={15} />
                    </div>
                    <div className='tag-design-timespent-info'>
                        <h4>Design and Testing</h4>
                        <p>Time spent in Design and testing each day</p>
                    </div>
                </div>
            </div>
        )
    }


    return (
        <div className="segment-analytics">
            <div className="segment-selector">
                <div className='segment-selector-title'>
                    <h2>DWV1001 Modules</h2>
                </div>

                <div className='segment-tag-list'>
                    {generateTagList()}
                </div>
            </div>

            <div className='edit-segments-map'>
                <div className='segment-map'>
                    <canvas id="mapCanvas" onMouseDown={(e) => getMousePos(document.getElementById("mapCanvas"), e)}></canvas>
                </div>
            </div>

            <div className='segment-analytics-right'>
                <div className='segment-analytics-title'>
                    <h1>{title}</h1>
                </div>
                {(selectedSegment == "none" && selectedTag == "none") ? generateComparisonContent()
                    : (selectedSegment != "none" && selectedTag == "none") ? generateViewSegmentContent() : generateTagContent()}
            </div>

        </div>
    )
}