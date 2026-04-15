import React from 'react';

const AlertContext = React.createContext([0, () => {}]);
export const AlertProvider = AlertContext.Provider;
export default AlertContext;