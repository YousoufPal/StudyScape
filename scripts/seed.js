// seed.js
// Place this file in a 'scripts' folder at your project root.
// Your JSON data file (e.g., 'study_spots_to_seed.json') should also be in this 'scripts' folder.

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from the .env file located at the project root
// (one level above this 'scripts' folder)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use SERVICE ROLE KEY for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
        "Supabase URL or Service Key is missing. \n" +
        "Ensure your project root .env file has EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY defined."
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- IMPORTANT: Configure Admin User ---
// 1. Create an "admin" user in your Supabase dashboard (Authentication -> Users -> Add User).
// 2. Go to Table Editor -> profiles table.
// 3. Find the 'id' (UUID) of your admin user's profile.
const ADMIN_USER_ID = '2f0d4214-7b62-4de6-8d53-1d88884b2674'; // <--- REPLACE THIS WITH YOUR ACTUAL ADMIN PROFILE UUID

if (ADMIN_USER_ID === 'YOUR_ADMIN_PROFILE_UUID_HERE' || !ADMIN_USER_ID) {
    console.error(
        "CRITICAL: Please replace 'YOUR_ADMIN_PROFILE_UUID_HERE' in seed.js " +
        "with the actual admin user's profile UUID from your Supabase 'profiles' table."
    );
    process.exit(1);
}

// --- CONFIGURATION ---
const JSON_FILE_NAME = 'study_spots_to_seed.json'; // Name of your JSON data file in this 'scripts' folder

const seedData = async () => {
    try {
        const filePath = path.join(__dirname, JSON_FILE_NAME);
        if (!fs.existsSync(filePath)) {
            console.error(`Error: JSON data file "${JSON_FILE_NAME}" not found at ${filePath}`);
            console.error("Please create this file with an array of spot objects matching your Supabase schema.");
            process.exit(1);
        }

        const jsonData = fs.readFileSync(filePath, 'utf-8');
        const spotsInputArray = JSON.parse(jsonData);

        if (!Array.isArray(spotsInputArray)) {
            console.error(`Error: Data in "${JSON_FILE_NAME}" is not a valid JSON array.`);
            process.exit(1);
        }

        console.log(`Found ${spotsInputArray.length} spots in "${JSON_FILE_NAME}". Preparing for insertion...`);

        const spotsToInsert = spotsInputArray.map((spot, index) => {
            // This mapping assumes your JSON_FILE_NAME already contains objects
            // that largely match your Supabase 'study_spots' table structure.
            // Add any necessary transformations or default values here.

            // Validate essential fields from the input spot object
            if (!spot.name || !spot.address || spot.latitude == null || spot.longitude == null) {
                console.warn(`Spot at index ${index} is missing essential fields (name, address, lat, lng). Skipping.`);
                return null; // Skip this spot
            }

            // Ensure numeric fields are numbers, provide defaults if necessary
            const latitude = parseFloat(spot.latitude);
            const longitude = parseFloat(spot.longitude);
            if (isNaN(latitude) || isNaN(longitude)) {
                console.warn(`Spot "${spot.name}" has invalid coordinates. Skipping.`);
                return null;
            }


            return {
                name: spot.name,
                description: spot.description || null,
                address: spot.address,
                suburb: spot.suburb || null,
                latitude: latitude,
                longitude: longitude,
                hours: spot.hours || null, // Expects JSONB structure or null
                contact_info: spot.contact_info || null, // Expects JSONB structure or null
                amenity_wifi: spot.amenity_wifi === true, // Ensure boolean
                amenity_power_outlets_available: spot.amenity_power_outlets_available === true, // Ensure boolean
                amenity_power_outlets_count: parseInt(spot.amenity_power_outlets_count, 10) || 0, // Default to 0 if not specified or invalid
                amenity_noise_level: spot.amenity_noise_level || null,
                amenity_food_available: spot.amenity_food_available === true, // Ensure boolean
                other_amenities: spot.other_amenities || null, // Expects JSONB or null
                photo_urls: Array.isArray(spot.photo_urls) ? spot.photo_urls : [], // Ensure it's an array
                tags: Array.isArray(spot.tags) ? spot.tags : [], // Ensure it's an array
                
                // Fields set by the script or database defaults
                added_by: ADMIN_USER_ID,
                average_overall_rating: parseFloat(spot.average_overall_rating) || 0, // Default to 0
                review_count: parseInt(spot.review_count, 10) || 0, // Default to 0
                created_at: spot.created_at ? new Date(spot.created_at).toISOString() : new Date().toISOString(),
                updated_at: spot.updated_at ? new Date(spot.updated_at).toISOString() : new Date().toISOString(),
            };
        }).filter(spot => spot !== null); // Remove any spots that were skipped due to missing essential data

        if (spotsToInsert.length === 0) {
            console.log("No valid spots to insert after initial validation. Exiting.");
            return;
        }

        console.log(`Attempting to insert ${spotsToInsert.length} valid spots...`);

        // Insert in chunks
        const CHUNK_SIZE = 50;
        for (let i = 0; i < spotsToInsert.length; i += CHUNK_SIZE) {
            const chunk = spotsToInsert.slice(i, i + CHUNK_SIZE);
            console.log(`Inserting chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(spotsToInsert.length / CHUNK_SIZE)} (size: ${chunk.length})...`);

            const { data, error } = await supabase
                .from('study_spots')
                .insert(chunk) // Supabase client handles an array of objects for bulk insert
                .select(); // Optional: if you want to see what was inserted or if an error occurred on a specific row

            if (error) {
                console.error('Error inserting chunk into Supabase:', JSON.stringify(error, null, 2));
                // You might want to log the chunk that failed for debugging
                // console.error('Failed chunk data (first item):', JSON.stringify(chunk[0], null, 2));
                // Decide if you want to stop on first error or continue and log all errors
                // For seeding, stopping on first error might be better to fix data issues.
                // return; 
            } else {
                console.log(`Successfully inserted ${data ? data.length : 0} spots in this chunk.`);
            }
        }

        console.log(`Seeding from "${JSON_FILE_NAME}" completed!`);

    } catch (error) {
        console.error('An error occurred during the seeding process:');
        if (error.message && error.message.includes('JSON.parse')) {
            console.error(`This might be due to an issue with the "${JSON_FILE_NAME}" file format. Ensure it's valid JSON.`);
        }
        console.error(error); // Log the full error object
    }
};

seedData();