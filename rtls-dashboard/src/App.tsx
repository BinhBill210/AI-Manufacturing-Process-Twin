import { useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import './App.css';

// Component and pages Imports
import Topbar from './components/scripts/Topbar';
import Sidebar from './components/scripts/Sidebar';
import Dashboard from './pages/scripts/Dashboard';
import TagLocation from './pages/scripts/TagLocation';
import Networks from './pages/scripts/Networks';
import AddNetwork from './pages/scripts/AddNetwork';
import EditNetwork from './pages/scripts/EditNetwork';
import Accuracy from './pages/scripts/Accuracy';
import AddSegment from './pages/scripts/AddSegment';
import MovementHistory from './pages/scripts/MovementHistory';
//import SegmentAnalytics from './pages/scripts/SegmentAnalytics';
import Addzone from './pages/scripts/AddZone';

// Context imports
import LocationContext from './contexts/LocationContext';
import AlertContext from './contexts/AlertContext';
import ProcessAnalytics from './pages/scripts/ProcessAnalytics';
import Collision from './pages/scripts/Collision';
import AddObstacle from './pages/scripts/AddObstacle';

const App: React.FC = () => {
  const location = useState<string>("0x0RT6");
  return (
    <div className="app-grid">
      <BrowserRouter>
        <LocationContext.Provider value={location}>
          <div className='topbar'>
            <Topbar />
          </div>

          <div className='sidebar'>
            <Sidebar />
          </div>

          <div className="content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/networks" element={<Networks />} />
              <Route path="/taglocation" element={<TagLocation />} />
              <Route path="/movementhistory" element={<MovementHistory />} />
              <Route path="/processanalytics" element={<ProcessAnalytics />} />
              <Route path="/accuracy" element={<Accuracy />} />
              <Route path="/addsegment" element={<AddSegment />} />
              <Route path="/addzone" element={<Addzone />} />
              <Route path="/addnetwork" element={<AddNetwork />} />
              <Route path="/collision" element={<Collision />} />
              <Route path="/addobstacle" element={<AddObstacle />} />
              <Route path="/editnetwork/">
                <Route index element={<EditNetwork />} />
                <Route path=":networkID" element={<EditNetwork />} />
              </Route>
            </Routes>
          </div>
        </LocationContext.Provider>
      </BrowserRouter>
    </div>
  );
}

export default App;