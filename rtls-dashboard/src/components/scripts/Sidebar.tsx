import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import NotificationBox from './NotificationBox';
import '../styles/Sidebar.css';

// Import React Icons
import { AiOutlineHome, AiOutlineSearch, AiOutlineHistory } from "react-icons/ai";
import { ImLocation } from "react-icons/im";
import { BiBullseye } from "react-icons/bi";
import { GrMapLocation } from "react-icons/gr";
import { DiGoogleAnalytics } from "react-icons/di";
import { CgDanger } from "react-icons/cg";
import {TbPresentation} from "react-icons/tb";

const Sidebar: React.FC = () => {
    const [currentPage, setCurrentPage] = useState<string>(window.location.pathname);
    const page = useLocation();

    useEffect(() => {
        setCurrentPage(window.location.pathname);
    }, [page]);

    const style: React.CSSProperties = { color: "white", fontSize: "1.5em" }; // Style for not active page
    const style2: React.CSSProperties = { color: "#11101d", fontSize: "1.5em" }; // Style for active page

    // Update the active page when page changes
    const handleOnClick = (): void => {
        setCurrentPage(window.location.pathname);
    }

    return (
        <div className="navbar">
            <div className='search-box'>
                <AiOutlineSearch className='search-logo' style={style2} />
                <input type="text" className='search-field' placeholder='Search..'></input>
            </div>

            <div className={(currentPage === "/dashboard") ? "active-link-item" : 'link-item'}>
                <AiOutlineHome className='logo' style={(currentPage === "/dashboard") ? style2 : style} />
                <Link to="/dashboard" className='link' onClick={() => handleOnClick()}>Dashboard</Link>
            </div>

            <div className={(currentPage === "/networks") ? "active-link-item" : 'link-item'}>
                <GrMapLocation className='logo' style={(currentPage === "/networks") ? style2 : style} />
                <Link to="/networks" className='link' onClick={() => handleOnClick()}>Networks</Link>
            </div>

            <div className={(currentPage === "/taglocation") ? "active-link-item" : 'link-item'}>
                <ImLocation className='logo' style={(currentPage === "/taglocation") ? style2 : style} />
                <Link to="/taglocation" className='link' onClick={() => handleOnClick()}>Tag Location</Link>
            </div>

            <div className={(currentPage === "/movementhistory") ? "active-link-item" : 'link-item'}>
                <AiOutlineHistory className='logo' style={(currentPage === "/movementhistory") ? style2 : style} />
                <Link to="/movementhistory" className='link' onClick={() => handleOnClick()}>Movement History</Link>
            </div>

            <div className={(currentPage === "/processanalytics") ? "active-link-item" : 'link-item'}>
                <TbPresentation className='logo' style={(currentPage === "/processanalytics") ? style2 : style} />
                <Link to="/processanalytics" className='link' onClick={() => handleOnClick()}>Process Analytics</Link>
            </div>

            <div className={(currentPage === "/collision") ? "active-link-item" : 'link-item'}>
                <CgDanger className='logo' style={(currentPage === "/collision") ? style2 : style} />
                <Link to="/collision" className='link' onClick={() => handleOnClick()}>Collision</Link>
            </div>

            <div className='notifications'>
                {<NotificationBox />}
            </div>

        </div>
    )
}

export default Sidebar;