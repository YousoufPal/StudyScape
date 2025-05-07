import firestore from '@react-native-firebase/firestore';

const spotsCollection = firestore().collection('spots');

export const getSpots = async () => {
    try {
        const snapshot = await spotsCollection.get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error("Error fetching spots: ", error);
        throw error;
    }
};

export const getSpotDetails = async (id) => {
    try {
        const doc = await spotsCollection.doc(id).get();
        if (doc.exists) {
            return { id: doc.id, ...doc.data() };
        } else {
            throw new Error('Spot not found');
        }
    } catch (error) {
        console.error("Error fetching spot details: ", error);
        throw error;
    }
};

export const addReview = async (spotId, review) => {
    try {
        const reviewsCollection = spotsCollection.doc(spotId).collection('reviews');
        await reviewsCollection.add(review);
    } catch (error) {
        console.error("Error adding review: ", error);
        throw error;
    }
};