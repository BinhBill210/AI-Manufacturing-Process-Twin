import React, { useContext, useEffect, useState } from 'react';
import '../styles/Accuracy.css';
import baseAxios from "../../BaseAxios";

import Barchart from '../../components/charts/scripts/Barchart';
import Linechart from '../../components/charts/scripts/Linechart';
import { DataGrid } from '@mui/x-data-grid';

import LocationContext from '../../contexts/LocationContext';

interface Tag {
    tagid: string;
    name: string;
}

interface DataItem {
    name: string;
    issue: string;
    time: string;
}

const Accuracy: React.FC = () => {
    const [location, setLocation] = useContext(LocationContext);
    const [selectionChanged, setSelectionChanged] = useState<boolean>(false);
    const [tagNames, setTagNames] = useState<Record<string, string>>({});
    const [selectedTags, setSelectedTags] = useState<Record<string, boolean>>({});

    const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedTags = { ...selectedTags, [e.target.value]: !selectedTags[e.target.value] };
        setSelectedTags(updatedTags);
        setSelectionChanged(!selectionChanged);
    };

    const getTagList = async () => {
        try {
            const response = await baseAxios.get(`/taglist/${location}`);
            const json: Tag[] = response.data;

            const selectedTagsTemp: Record<string, boolean> = {};
            const tagNamesTemp: Record<string, string> = {};

            json.forEach(tag => {
                selectedTagsTemp[tag.tagid] = false;
                tagNamesTemp[tag.tagid] = tag.name;
            });

            setTagNames(tagNamesTemp);
            setSelectedTags(selectedTagsTemp);
        } catch (error) {
            console.error("Error fetching tag list:", error);
        }
    };

    useEffect(() => {
        getTagList();
    }, [location]);

    function generateTagList() {
        var tagList = [];

        if (selectedTags != null) {
            var tagid;
            for (var i = 0; i < Object.keys(selectedTags).length; i++) {
                tagid = Object.keys(selectedTags)[i];
                tagList.push(<div key={tagid} className={(selectedTags[tagid]) ? "form-element-active" : 'form-element'}>
                    <input className="accuracy-checkbox" type='checkbox' name='tag' value={tagid} id={tagid} onChange={(e) => handleCheck(e)}></input>
                    <label htmlFor={tagid} className='checkbox-label'>
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
                <h2>Recent Issues</h2> {/* Add your title here */}
                <div style={{ height: '100%', width: '100%', marginLeft: '0px' }}>
                    <DataGrid
                        rows={rows}
                        rowHeight={70}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[10]}
                    />
                </div>
            </div>
        )
    }

    function generateTagComparisonContent() {
        return (
            <div className='view-accuracy-content'>
                <div className='tag-overall-accuracy'>
                    <div className='tag-overall-accuracy-chart'>
                        <Barchart title='Tag Accuracy' labels={['Normal', '1 Foil', '5 Foil', 'Eski', 'Wood Box']}
                            data={[85, 67, 25, 61, 58]} color='White' outline='white' max={15} />
                    </div>
                    <div className='tag-segment-timespent-info'>
                        <h4>Tag Accuracy</h4>
                        <p>Expected Tag Accuracy based on reported quality, positional variance and unsuccesfull location read</p>
                    </div>
                </div>

                <div className='tag-average-quality'>
                    <div className='tag-average-quality-chart'>
                        <Barchart title='Tag Quality' labels={['Normal', '1 Foil', '5 Foil', 'Eski', 'Wood Box']}
                            data={[85, 67, 25, 61, 58]} color='White' outline='white' max={100} />
                    </div>
                    <div className='tag-average-quality-info'>
                        <h4>Tag Quality</h4>
                        <p>Average location quality number reported by tag</p>
                    </div>
                </div>

                <div className='tag-positonal-variance'>
                    <div className='tag-positonal-variance-chart'>
                        <Barchart title='Positional Variance (cm)' labels={['Normal', '1 Foil', '5 Foil', 'Eski', 'Wood Box']}
                            data={[2.4, 3.6, 14, 5, 4.6]} color='White' outline='white' max={20} />
                    </div>
                    <div className='tag-positonal-variance-info'>
                        <h4>Positional Variance (cm)</h4>
                        <p>Variance of reported position when tag is stationary</p>
                    </div>
                </div>

                <div className='tag-location-error'>
                    <div className='tag-location-error-chart'>
                        <Barchart title='Location Error (%)' labels={['Normal', '1 Foil', '5 Foil', 'Eski', 'Wood Box']}
                            data={[85, 67, 25, 61, 58]} color='White' outline='white' max={15} />
                    </div>
                    <div className='tag-location-error-info'>
                        <h4>Location Error (%)</h4>
                        <p>Percent of time there is an error reporting tag location</p>
                    </div>
                </div>

            </div>
        )
    }

    function generateTagView() {
        return (
            <div className='tag-accuracy-view'>
                <div className='segment-activity2'>
                    <div className='segment-activity-chart2'>
                        <Linechart title='Segment activity' labels={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']}
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

    return (
        <div className="accuracy">
            <div className='accuracy-tag-selector'>
                <div className='accuracy-selector-title'>
                    <h2>DWV1001 Modules</h2>
                </div>

                <div className='accuracy-list'>
                    {generateTagList()}
                </div>
            </div>

            <div className='accuracy-content'>
                {generateTagComparisonContent()}
            </div>
        </div>
    )
}

export default Accuracy;