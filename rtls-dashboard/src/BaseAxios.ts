import axios from 'axios';

const baseAxios = axios.create({
    baseURL: process.env.REACT_APP_URL,
    responseType: 'json',
    timeout: 30000
});

// Handle request errors
baseAxios.interceptors.request.use(
    config => {
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// Handle response errors
baseAxios.interceptors.response.use(
    (response) => response,
    (error) => {
        // Check if error.response exists before trying to access its properties
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Handle 401 and 403 status codes here if needed
        }

        return Promise.reject(error);
    }
);
export default baseAxios;