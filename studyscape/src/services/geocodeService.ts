import axios from 'axios';

const GEOCODING_API_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const API_KEY = process.env.GOOGLE_GEOCODING_API_KEY;

export const geocodeAddress = async (address) => {
    try {
        const response = await axios.get(GEOCODING_API_URL, {
            params: {
                address,
                key: API_KEY,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching geocode data:', error);
        throw error;
    }
};