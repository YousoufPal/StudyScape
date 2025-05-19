// C:\Users\pyous\Downloads\StudyScape\scripts\seed.js

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables from the .env file located one directory above the current script
// (e.g., C:\Users\pyous\Downloads\StudyScape\.env)
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error(
        "Supabase URL or Service Key is missing. Check your .env file at the project root (one level above the 'scripts' folder)."
    );
    console.log('Loaded SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING');
    console.log('Loaded SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'OK' : 'MISSING');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// --- IMPORTANT: Configure Admin User ---
// 1. Create an "admin" user in your Supabase dashboard (Authentication -> Users -> Add User).
// 2. Go to Table Editor -> profiles table.
// 3. Find the 'id' (UUID) of your admin user's profile.
const ADMIN_USER_ID = 'b30009bb-72e5-427f-a341-623ebdbb14de'; // <--- REPLACE THIS WITH THE ACTUAL UUID

if (ADMIN_USER_ID === 'YOUR_ADMIN_PROFILE_UUID') {
    console.error(
    );
    process.exit(1);
}

const seedData = async () => {
    try {
        const filePath = path.join(__dirname, 'study_spots.json'); // Assumes study_spots.json is in the same directory as seed.js
        if (!fs.existsSync(filePath)) {
            console.error(`Error: study_spots.json not found at ${filePath}`);
            process.exit(1);
        }

        const jsonData = fs.readFileSync(filePath, 'utf-8');
        const spots = JSON.parse(jsonData);

        console.log(`Found ${spots.length} spots in study_spots.json. Preparing for insertion...`);

        const spotsToInsert = spots.map((spot, index) => {
            // Direct mappings
            const name = spot.name;
            const description = spot.description || null;
            const address = spot.address;
            const suburb = spot.suburb || null;
            const latitude = spot.coordinates ? spot.coordinates.latitude : null;
            const longitude = spot.coordinates ? spot.coordinates.longitude : null;

            if (latitude === null || longitude === null) {
                console.warn(`Warning: Spot "${name}" (index ${index}) is missing coordinates. Skipping or setting to null.`);
                // Decide if you want to skip or insert with nulls, depending on your table constraints
            }

            // JSONB fields
            const hours_data = spot.hours || null;
            const contact_info_data = spot.contact || null;

            // Specific Amenity Columns
            const amenities = spot.amenities || {}; // Ensure amenities object exists
            const amenity_wifi = amenities.wifi || false;
            const amenity_power_outlets_count = amenities.power_outlets || 0;
            const amenity_power_outlets_available = amenity_power_outlets_count > 0;
            const amenity_food_available = amenities.food_available || false;
            const amenity_noise_level = amenities.noise_level || 'Unknown';

            // 'other_amenities' JSONB column
            const {
                wifi, power_outlets, food_available, noise_level, // these are handled above
                // List all other known keys from your JSON amenities that you want in `other_amenities`
                coffee_rating, matcha_rating, seating_comfort, table_space,
                price_range, indoor_outdoor, natural_light, accessibility,
                parking, public_transport,
                ...remainingRawAmenities // Captures any truly unexpected keys
            } = amenities;

            const other_amenities_data = {
                coffee_rating: coffee_rating !== undefined ? coffee_rating : null,
                matcha_rating: matcha_rating !== undefined ? matcha_rating : null,
                seating_comfort: seating_comfort !== undefined ? seating_comfort : null,
                table_space: table_space !== undefined ? table_space : null,
                price_range: price_range !== undefined ? price_range : null,
                indoor_outdoor: indoor_outdoor !== undefined ? indoor_outdoor : null,
                natural_light: natural_light !== undefined ? natural_light : null,
                accessibility: accessibility !== undefined ? accessibility : null,
                parking: parking !== undefined ? parking : null,
                public_transport: public_transport !== undefined ? public_transport : null,
                ...remainingRawAmenities // Include any other keys that were in the original amenities
            };

            // Array fields
            const photo_urls_data = spot.photos || [];
            const tags_data = spot.tags || [];

            // added_by
            let addedById = null;
            if (spot.added_by === 'admin' && ADMIN_USER_ID) {
                addedById = ADMIN_USER_ID;
            } else if (spot.added_by && spot.added_by.startsWith('user_')) {
                // For now, assign to admin or null for other seeded users
                // addedById = ADMIN_USER_ID; // Or, keep as null
                console.warn(`Spot "${name}" added_by "${spot.added_by}" - will be set to NULL or Admin for now.`);
            }


            // Ratings
            const average_ratings = spot.average_ratings || {};
            const average_overall_rating_data = average_ratings.overall !== undefined ? average_ratings.overall : 0;
            const review_count_data = average_ratings.review_count !== undefined ? average_ratings.review_count : (average_overall_rating_data > 0 ? 1 : 0);


            // Timestamps
            const created_at_data = spot.created_at ? new Date(spot.created_at).toISOString() : new Date().toISOString();
            const updated_at_data = spot.updated_at ? new Date(spot.updated_at).toISOString() : new Date().toISOString();

            return {
                name: name,
                description: description,
                address: address,
                suburb: suburb,
                latitude: latitude,
                longitude: longitude,
                hours: hours_data,
                contact_info: contact_info_data,
                amenity_wifi: amenity_wifi,
                amenity_power_outlets_available: amenity_power_outlets_available,
                amenity_power_outlets_count: amenity_power_outlets_count,
                amenity_noise_level: amenity_noise_level,
                amenity_food_available: amenity_food_available,
                other_amenities: other_amenities_data,
                photo_urls: photo_urls_data,
                tags: tags_data,
                added_by: addedById,
                average_overall_rating: average_overall_rating_data,
                review_count: review_count_data,
                created_at: created_at_data,
                updated_at: updated_at_data,
            };
        });

        // Filter out any spots that might be invalid (e.g., missing critical data like lat/lng if your table requires them)
        const validSpotsToInsert = spotsToInsert.filter(spot => spot.latitude !== null && spot.longitude !== null); // Example validation
        if (validSpotsToInsert.length !== spotsToInsert.length) {
            console.warn(`Filtered out ${spotsToInsert.length - validSpotsToInsert.length} spots due to missing critical data (e.g., coordinates).`);
        }


        if (validSpotsToInsert.length === 0) {
            console.log("No valid spots to insert. Exiting.");
            return;
        }

        console.log(`Attempting to insert ${validSpotsToInsert.length} valid spots...`);

        const CHUNK_SIZE = 50; // Insert in chunks to avoid overwhelming the database
        for (let i = 0; i < validSpotsToInsert.length; i += CHUNK_SIZE) {
            const chunk = validSpotsToInsert.slice(i, i + CHUNK_SIZE);
            console.log(`Inserting chunk ${Math.floor(i / CHUNK_SIZE) + 1} of ${Math.ceil(validSpotsToInsert.length / CHUNK_SIZE)} (size: ${chunk.length})...`);

            const { data, error } = await supabase
                .from('study_spots')
                .insert(chunk)
                .select(); // .select() can help see what was inserted or if an error occurred on a specific row

            if (error) {
                console.error('Error inserting chunk:', error);
                // Log more details for debugging
                console.error('Failed chunk data (first item):', chunk[0]);
                // You might want to stop on first error or log and continue
                // return;
            } else {
                console.log(`Successfully inserted ${data ? data.length : 0} spots in this chunk.`);
            }
        }

        console.log('Seeding completed!');

    } catch (error) {
        console.error('An error occurred during the seeding process:', error);
        if (error.message.includes('JSON.parse')) {
            console.error("This might be due to an issue with the study_spots.json file format.");
        }
    }
};

seedData();