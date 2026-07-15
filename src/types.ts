export interface Crop {
  id: string;
  name: string;
  icon: string; // lucide icon name or emoji
  companionPlants: string[]; // names or ids of good neighbors
  antagonisticPlants: string[]; // names or ids of bad neighbors
  growingDays: number;
  waterNeeds: 'Low' | 'Medium' | 'High';
  sunNeeds: 'Full Sun' | 'Partial Shade' | 'Full Shade';
  spacingCm: number;
  expectedYieldKg: number; // per square foot or per plant
  category: 'Vegetable' | 'Herb' | 'Fruit' | 'Flower';
  description: string;
}

export interface GardenPlot {
  id: string;
  name: string;
  width: number;
  height: number;
  layout: Record<string, string>; // keys are "x,y", values are cropId
  companionStatus: Record<string, 'companion' | 'antagonistic' | 'neutral'>; // key is "x,y"
  companionFeedback: Record<string, string>; // explanation of issues/benefits for "x,y"
  createdAt: string;
}

export interface WeatherData {
  temp: number;
  condition: 'sunny' | 'rainy' | 'cloudy' | 'storm' | 'frost' | 'heatwave';
  humidity: number;
  wind: number;
  forecast: Array<{
    day: string;
    temp: number;
    condition: 'sunny' | 'rainy' | 'cloudy' | 'storm' | 'frost' | 'heatwave';
  }>;
  alerts: Array<{
    id: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    advice: string;
  }>;
}

export interface MarketplaceItem {
  id: string;
  title: string;
  description: string;
  category: 'seeds' | 'produce' | 'tools' | 'compost' | 'other';
  price: number | 'Free' | 'Trade';
  quantity: string;
  lat: number;
  lng: number;
  address: string;
  sellerName: string;
  sellerEmail: string;
  dateAdded: string;
  imageUrl?: string;
}

export interface CommunityPost {
  id: string;
  author: string;
  authorRole: 'Grower' | 'Organizer' | 'Expert' | 'Municipal';
  avatar: string; // color or character
  title: string;
  content: string;
  tags: string[];
  likes: number;
  likedByUser?: boolean;
  comments: Array<{
    id: string;
    author: string;
    content: string;
    date: string;
  }>;
  date: string;
  imageUrl?: string;
}

export interface SensorTelemetry {
  timestamp: string;
  moisture: number; // percentage
  temperature: number; // °C
  pH: number;
  light: number; // percentage
}

export interface UserProfile {
  name: string;
  experience: 'Beginner' | 'Intermediate' | 'Expert' | 'Commercial';
  gardenSize: number; // in sq ft
  location: string;
  primaryGoal: string;
}
