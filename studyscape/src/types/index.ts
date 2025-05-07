export interface Spot {
  id: string;
  name: string;
  coords: {
    lat: number;
    lng: number;
  };
  category: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId: string;
  scores: {
    noise: number;
    comfort: number;
    wifi: number;
  };
  comment: string;
  createdAt: Date;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
}