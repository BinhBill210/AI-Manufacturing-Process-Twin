import React, { Dispatch, SetStateAction } from 'react';

// Define the type for the context value
type LocationContextType = [
    string,
    Dispatch<SetStateAction<string>>
];

// Create context with a default value
const LocationContext = React.createContext<LocationContextType>(["0x0RT6", () => { }]);

export const LocationProvider = LocationContext.Provider;
export default LocationContext;