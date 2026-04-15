import { useContext, useEffect, useState, MouseEvent } from "react";
import { GoPerson, GoTools } from "react-icons/go";
import { IoMdWarning } from "react-icons/io";
import { BsFillTagFill } from "react-icons/bs";
import { FiPlusSquare } from "react-icons/fi";
import baseAxios from "../../BaseAxios";

import LocationContext from "../../contexts/LocationContext";
import '../styles/NotificationBox.css';

interface Notification {
    type: string;
    name: string;
    time_created: string;
    id: string;
    [key: string]: any;
}

export default function NotificationBox() {
    const [notifications, setNotifications] = useState<Notification[] | null>(null);
    const [time, setTime] = useState<number>(Date.now());
    const [location, setLocation] = useContext(LocationContext);
    const [deletedNotification, setDeletedNotification] = useState<boolean>(false);

    const getNotifications = async () => {
        try {
            const response = await baseAxios.get(`/notification-list/${location}`);
            setNotifications(response.data);
        } catch (error) {
            console.error("Error getting notifications:", error);
        }
    }

    useEffect(() => {
        const interval = setInterval(() => setTime(Date.now()), 500);
        getNotifications();
        return () => {
            clearInterval(interval);
        };
    }, [time, deletedNotification]);

    function NotificationIcon({ type }: { type: string }) {
        if (type === 'Restricted') return <IoMdWarning size='35' color='red' />;
        if (type === 'Re-Assignment') return <BsFillTagFill size='35' color='green' />;
        return <FiPlusSquare size='35' color='blue' />;
    }
    
    function formatTime(time: string): string {
        return time.split('T')[1].split('.')[0];
    }
    
    const deleteNotification = async (id: string) => {
        try {
            await baseAxios.delete(`/delete-notification/${id}`);
            setDeletedNotification(!deletedNotification);
        } catch (error) {
            console.error("Error deleting notification:", error);
        }
    }
    
    function generateNotificationList() {
        return notifications?.map(notification => (
            <div key={notification.id} className='notification-item'>
                <div className='notification-left'>
                    <NotificationIcon type={notification.type} />
                </div>
                <div className='notification-right'>
                    <h3 className='notification-name'>{notification.name}</h3>
                    <p className='notification-time'>Time - {formatTime(notification.time_created)}</p>
                </div>
                <div className='notification-delete'>
                    <button onClick={() => deleteNotification(notification.id)}>X</button>
                </div>
            </div>
        ));
    }

    return (
        <div className="notification-box">
            <div className="notification-title">
                <h2>Notifications</h2>
            </div>
            <div className="notification-list">
                {generateNotificationList()}
            </div>
        </div>
    );
}