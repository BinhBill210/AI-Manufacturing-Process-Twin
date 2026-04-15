import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import baseAxios from "../../BaseAxios";

import '../styles/AddNetwork.css'

export default function AddNetwork() {
    const [network, setNetwork] = useState('');
    const [name, setName] = useState('');
    const [filename, setFilename] = useState('');
    const [width, setWidth] = useState('');
    const [height, setHeight] = useState('');
    const [modules, setModules] = useState(['', '', '', '', '']);

    const navigate = useNavigate();

    async function addNetwork() {
        const modulesString = modules.join(' ');
        try {
            await baseAxios.get(`/add-network/${network}/${name}/${filename}/${width}/${height}/${modulesString}`);
            navigate('/networks/');
        } catch (error) {
            console.error('Error adding network:', error);
        }
    }

    return (
        <div className="add-network">
            <div className='add-network-header'>
                <h1>Add Network</h1>
            </div>
            <div className='add-network-content'>

                <div className='add-network-details'>
                    <p className='add-network-labels'>Network ID</p>
                    <p className='add-network-labels'>Name</p>
                    <p className='add-network-labels'>filename</p>
                    <p className='add-network-labels'>Width</p>
                    <p className='add-network-labels'>Height</p>
                </div>

                <div className='add-network-details'>
                    <input type='text' className="add-network-inputs" id='networkid-input'></input>
                    <input type='text' className="add-network-inputs" id='add-name-input'></input>
                    <input type='text' className="add-network-inputs" id='floorplan-file'></input>
                    <input type='number' className="add-network-inputs" id='floorplan-width'></input>
                    <input type='number' className="add-network-inputs" id='floorplan-height'></input>
                </div>

                <div className='add-network-modules'>
                    <div className='add-network-title'>
                        <h2>Add Modules</h2>
                    </div>

                    <input type='text' className='id-inputs' id='id1'></input>
                    <input type='text' className='id-inputs' id='id2'></input>
                    <input type='text' className='id-inputs' id='id3'></input>
                    <input type='text' className='id-inputs' id='id4'></input>
                    <input type='text' className='id-inputs' id='id5'></input>
                </div>
                <button className='add-network-btn' onClick={(e) => addNetwork()}>Add Network</button>
            </div>
        </div>
    )
}