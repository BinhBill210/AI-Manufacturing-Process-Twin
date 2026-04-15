import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LocationContext from '../../contexts/LocationContext';
import '../styles/Networks.css'
import baseAxios from '../../BaseAxios';

interface Network {
    name: string;
    networkid: string;
    anchor_count: number;
    tag_count: number;
    floorplan_filename: string;
    [key: string]: any;
}

export default function Networks() {
    const [networks, setNetworks] = useState<Network[]>([])
    const [location, setLocation] = useContext(LocationContext);

    const navigate = useNavigate()

    const getNetworks = async () => {
        try {
            const response = await baseAxios.get(`/networklist`);
            setNetworks(response.data);
        } catch (error) {
            console.error("Error fetching networks:", error);
        }
    }

    function editNetwork(network: string) {
        setLocation(network)
        var link = '/editnetwork/' + network
        navigate(link)
    }

    function addNetwork(e: any) {
        var link = '/addnetwork/'
        navigate(link)
    }

    useEffect(() => {
        getNetworks();
    }, [])


    function generateNetworkList() {
        const networkList: JSX.Element[] = [];

        if (networks) {
            networks.forEach((network: Network) => {
                networkList.push(
                    <li key={network.networkid} className='network-list-item'>
                        <h3 className='network-name'>{network.name}</h3>
                        <p className='network-id'>{network.networkid}</p>
                        <p className='anchor-count'>Anchors: {network.anchor_count}</p>
                        <p className='tag-count'>Tags: {network.tag_count}</p>
                        <p className='floorplan-filename'>{network.floorplan_filename}</p>
                        <div className='edit'>
                            <button className='edit-button' value={network.networkid} onClick={(e) => editNetwork(e.currentTarget.value)}>Edit</button>
                        </div>
                    </li>
                );
            });
        }

        return networkList;
    }

    return (
        <div className="networks">
            <div className='networks-header'>
                <h2 id="networks-title">Networks</h2>
            </div>
            <div className='networks-content'>
                <ul className='network-list'>

                    {generateNetworkList()}
                    <li className='network-list-new'>
                        <button className='new-button' onClick={(e) => addNetwork(e)}>Add Network</button>
                    </li>
                </ul>
            </div>
        </div>
    )
}