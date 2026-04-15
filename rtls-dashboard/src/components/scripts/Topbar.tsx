import React, { useState, useContext, useEffect } from 'react';
import '../styles/Topbar.css';
import LocationContext from '../../contexts/LocationContext';
import baseAxios from "../../BaseAxios";

interface Network {
    networkid: string;
    name: string;
}

const Topbar: React.FC = () => {
    const [networks, setNetworks] = useState<Network[] | null>(null);
    const [location, setLocation] = useContext(LocationContext);

    const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setLocation(e.target.value);
    };

    const getNetworkList = async () => {
        try {
            const response = await baseAxios.get<Network[]>('/topbar-network-list/');
            setNetworks(response.data);
        } catch (error) {
            console.error("Error fetching network list:", error);
        }
    };

    useEffect(() => {
        getNetworkList();
    }, []);

    // When networks load, if no location is set, default to the first item
    useEffect(() => {
        if (networks && networks.length > 0) {
            if (!location) {
                setLocation(networks[0].networkid);
            }
        }
    }, [networks]);

    const generateNetworkList = () => {
        return networks?.map(network => (
            <option
                value={network.networkid}
                id={network.networkid}
                key={network.networkid}
            >
                {network.name}
            </option>
        ));
    };

    return (
        networks &&
        <div className="topbar-container">
            <div className='location-picker'>
                <select
                    name="location"
                    id="location"
                    value={location}            // ← DEFAULTS TO CONTEXT VALUE
                    onChange={handleLocationChange}
                >
                    {generateNetworkList()}
                </select>
            </div>
        </div>
    );
};

export default Topbar;
