import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { ai as geminiClient, GEMINI_MODEL, generateContentWithFallback } from './lib/gemini';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Setup standard middleware
app.use(express.json({ limit: '10mb' }));

// Ensure data persistence directory exists
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helpers for file persistence
const getFilePath = (filename: string) => path.join(DATA_DIR, filename);

const readData = <T>(filename: string, defaultData: T): T => {
  const filePath = getFilePath(filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
    return defaultData;
  }
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading ${filename}, resetting to default:`, err);
    return defaultData;
  }
};

const writeData = <T>(filename: string, data: T): void => {
  const filePath = getFilePath(filename);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Error writing ${filename}:`, err);
  }
};

// Seed Crops Data (Static Reference)
const CROPS = [
  {
    id: 'tomato',
    name: 'Tomato',
    icon: '🍅',
    companionPlants: ['Basil', 'Marigold', 'Garlic', 'Carrot'],
    antagonisticPlants: ['Potato', 'Fennel', 'Cabbage', 'Corn'],
    growingDays: 75,
    waterNeeds: 'High',
    sunNeeds: 'Full Sun',
    spacingCm: 45,
    expectedYieldKg: 4.5,
    category: 'Vegetable',
    description: 'Vibrant, sun-loving vine that produces juicy, nutrient-rich fruits. Extremely rewarding but needs robust companion layout to repel pests.'
  },
  {
    id: 'basil',
    name: 'Basil',
    icon: '🌿',
    companionPlants: ['Tomato', 'Pepper', 'Oregano'],
    antagonisticPlants: ['Rue', 'Sage'],
    growingDays: 45,
    waterNeeds: 'Medium',
    sunNeeds: 'Full Sun',
    spacingCm: 20,
    expectedYieldKg: 0.8,
    category: 'Herb',
    description: 'Aromatic herb that actively improves the flavor of neighboring tomatoes and peppers while repelling mosquitoes and thrips.'
  },
  {
    id: 'marigold',
    name: 'Marigold',
    icon: '🌼',
    companionPlants: ['Tomato', 'Eggplant', 'Pepper', 'Potato', 'Kale'],
    antagonisticPlants: [],
    growingDays: 60,
    waterNeeds: 'Low',
    sunNeeds: 'Full Sun',
    spacingCm: 25,
    expectedYieldKg: 0.2,
    category: 'Flower',
    description: 'The ultimate garden companion. Emits chemical signals from its roots that actively suppress harmful nematodes and masks crop scents from pests.'
  },
  {
    id: 'carrot',
    name: 'Carrot',
    icon: '🥕',
    companionPlants: ['Lettuce', 'Chives', 'Rosemary', 'Radish', 'Tomato'],
    antagonisticPlants: ['Dill', 'Fennel'],
    growingDays: 70,
    waterNeeds: 'Medium',
    sunNeeds: 'Full Sun',
    spacingCm: 10,
    expectedYieldKg: 1.2,
    category: 'Vegetable',
    description: 'Deep root crop that loosens soil for shallow-rooted salad crops. Rosemary repels the carrot rust fly, making them excellent partners.'
  },
  {
    id: 'potato',
    name: 'Potato',
    icon: '🥔',
    companionPlants: ['Bush Beans', 'Cabbage', 'Marigold', 'Horseradish'],
    antagonisticPlants: ['Tomato', 'Sunflower', 'Cucumber', 'Pumpkin'],
    growingDays: 100,
    waterNeeds: 'Medium',
    sunNeeds: 'Full Sun',
    spacingCm: 30,
    expectedYieldKg: 3.5,
    category: 'Vegetable',
    description: 'Hearty tuber that thrives in loose, aerated soils. Must be kept far away from Tomatoes as they share vulnerability to early/late blight.'
  },
  {
    id: 'kale',
    name: 'Kale',
    icon: '🥬',
    companionPlants: ['Marigold', 'Mint', 'Dill', 'Garlic'],
    antagonisticPlants: ['Tomato', 'Strawberry'],
    growingDays: 55,
    waterNeeds: 'Medium',
    sunNeeds: 'Partial Shade',
    spacingCm: 30,
    expectedYieldKg: 2.0,
    category: 'Vegetable',
    description: 'Cold-hardy superfood. Mint and dill repel cabbage loopers and moths that often target brassicas.'
  },
  {
    id: 'strawberry',
    name: 'Strawberry',
    icon: '🍓',
    companionPlants: ['Borage', 'Spinach', 'Garlic', 'Onion'],
    antagonisticPlants: ['Kale', 'Cabbage', 'Broccoli'],
    growingDays: 90,
    waterNeeds: 'Medium',
    sunNeeds: 'Full Sun',
    spacingCm: 25,
    expectedYieldKg: 1.5,
    category: 'Fruit',
    description: 'Sweet ground cover. Borage attracts pollinators like wild bumblebees and improves fruit yield and sugar concentrations.'
  },
  {
    id: 'garlic',
    name: 'Garlic',
    icon: '🧄',
    companionPlants: ['Tomato', 'Strawberry', 'Pepper', 'Spinach'],
    antagonisticPlants: ['Peas', 'Beans', 'Asparagus'],
    growingDays: 240,
    waterNeeds: 'Low',
    sunNeeds: 'Full Sun',
    spacingCm: 15,
    expectedYieldKg: 1.0,
    category: 'Herb',
    description: 'Natural anti-fungal and pest deterrent. Protects strawberries from fruit rot and tomatoes from spider mites, but stunts legumes.'
  },
  {
    id: 'lettuce',
    name: 'Lettuce',
    icon: '🥗',
    companionPlants: ['Carrot', 'Chives', 'Radish', 'Cucumber'],
    antagonisticPlants: ['Celery', 'Parsley'],
    growingDays: 40,
    waterNeeds: 'Medium',
    sunNeeds: 'Partial Shade',
    spacingCm: 15,
    expectedYieldKg: 0.9,
    category: 'Vegetable',
    description: 'Fast-growing tender green. Benefits from taller companions providing shade in hot weather, preventing premature bolting.'
  }
];

// Initialize persistent databases with realistic seed data
const DEFAULT_GARDENS = [
  {
    id: 'garden-1',
    name: 'Rooftop Oasis Plot',
    width: 6,
    height: 4,
    layout: {
      '0,0': 'tomato', '1,0': 'basil', '2,0': 'marigold', '3,0': 'lettuce',
      '0,1': 'tomato', '1,1': 'basil', '2,1': 'carrot', '3,1': 'lettuce',
      '0,2': 'garlic', '1,2': 'strawberry', '2,2': 'carrot', '3,2': 'kale',
      '0,3': 'garlic', '1,3': 'strawberry', '2,3': 'kale', '3,3': 'kale'
    },
    companionStatus: {
      '0,0': 'companion', '1,0': 'companion', '2,0': 'companion', '3,0': 'neutral',
      '0,1': 'companion', '1,1': 'companion', '2,1': 'neutral', '3,1': 'neutral',
      '0,2': 'companion', '1,2': 'companion', '2,2': 'neutral', '3,2': 'companion',
      '0,3': 'companion', '1,3': 'companion', '2,3': 'companion', '3,3': 'companion'
    },
    companionFeedback: {
      '0,0': 'Thriving next to Basil & Marigold. Basil enhances flavor and repels thrips, while Marigolds defend against root-knot nematodes.',
      '1,0': 'Superb. Basil benefits from Tomato shade and contributes to pest deflection.',
      '2,0': 'Excellent companion. Protects the Tomatoes and adjacent crops.',
      '0,2': 'Garlic acts as a natural fungicide protecting nearby Strawberries from grey mold (Botrytis).',
      '1,2': 'Highly compatible. Safe from mold thanks to Garlic roots.',
      '2,3': 'Growing next to Kale which is benefited by Marigold repelling cabbage loops.'
    },
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_MARKETPLACE = [
  {
    id: 'item-1',
    title: 'Surplus Organic Roma Tomatoes',
    description: 'Freshly harvested this morning from my rooftop container garden! Grown 100% organically with compost. Sweet, firm, and excellent for salads or homemade sauces.',
    category: 'produce',
    price: 3.50,
    quantity: '2 lbs bag',
    lat: 37.7749 + (Math.random() - 0.5) * 0.02,
    lng: -122.4194 + (Math.random() - 0.5) * 0.02,
    address: 'Mission District, San Francisco',
    sellerName: 'Elena Rostova',
    sellerEmail: 'elena.grower@gmail.com',
    dateAdded: new Date(Date.now() - 36 * 3600000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'item-2',
    title: 'Heirloom Genovese Basil Seeds',
    description: 'Plentiful seeds collected from my stellar companion companion plants. Extremely aromatic, high germination rate. Packaged in recycled paper envelopes.',
    category: 'seeds',
    price: 'Free',
    quantity: '30-40 seeds packet',
    lat: 37.7749 + (Math.random() - 0.5) * 0.02,
    lng: -122.4194 + (Math.random() - 0.5) * 0.02,
    address: 'Hayes Valley Community Garden',
    sellerName: 'Marcus Chen',
    sellerEmail: 'marcus.seeds@yahoo.com',
    dateAdded: new Date(Date.now() - 12 * 3600000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1515586000433-45406d8e6662?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'item-3',
    title: 'Rich Oak-Leaf Compost (Aged)',
    description: 'Black gold! Double-sifted, fully matured compost made from leaf mould and fruit scraps. Rich in mycorrhizal fungi to kickstart root development.',
    category: 'compost',
    price: 'Trade',
    quantity: '10 Gallon Bucket',
    lat: 37.7749 + (Math.random() - 0.5) * 0.02,
    lng: -122.4194 + (Math.random() - 0.5) * 0.02,
    address: 'Sunset District, SF',
    sellerName: 'Sarah Jenkins',
    sellerEmail: 'sarah.j.compost@gmail.com',
    dateAdded: new Date(Date.now() - 4 * 3600000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400'
  }
];

const DEFAULT_COMMUNITY = [
  {
    id: 'post-1',
    author: 'Chief Agronomist Dan',
    authorRole: 'Expert',
    avatar: 'bg-emerald-600 text-white',
    title: 'Beat the upcoming heatwave with deep-mulching',
    content: 'We are seeing a massive heat dome forming over the state starting next Tuesday. To protect young root structures, apply 2-3 inches of dry straw or shredded leaves. This acts as a protective blanket, lowering soil temperature by up to 8°F and conserving 70% more soil moisture. Do not use grass clippings as they compact and block oxygen!',
    tags: ['Resilience', 'WaterSaving', 'HeatwaveAdvice'],
    likes: 24,
    likedByUser: false,
    comments: [
      {
        id: 'c-1',
        author: 'Chloe Smith',
        content: 'Just bought a straw bale! Thank you so much for this timed warning.',
        date: new Date(Date.now() - 8 * 3600000).toISOString()
      },
      {
        id: 'c-2',
        author: 'Elena Rostova',
        content: 'Is straw safe for raised tomato beds? Will it attract slugs?',
        date: new Date(Date.now() - 6 * 3600000).toISOString()
      }
    ],
    date: new Date(Date.now() - 10 * 3600000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1622383563227-04401ab4e5ea?auto=format&fit=crop&q=80&w=500'
  },
  {
    id: 'post-2',
    author: 'Green City Initiative',
    authorRole: 'Municipal',
    avatar: 'bg-sky-600 text-white',
    title: 'Rooftop Farming Subsidies 2026 Open for Applications!',
    content: 'Excellent news for SF residents! The city council has approved a $150,000 extension to our micro-farming grants. Rooftop, driveway, and community garden plots over 100 sq ft can receive up to $1,500 for rain-harvesting barrels, organic soil setup, and companion crop seeds. Apply in the municipal tab under Resilience!',
    tags: ['Grants', 'CommunityGardens', 'UrbanFarming'],
    likes: 42,
    likedByUser: false,
    comments: [],
    date: new Date(Date.now() - 24 * 3600000).toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?auto=format&fit=crop&q=80&w=500'
  }
];

// Initialize standard files
let gardens = readData('gardens.json', DEFAULT_GARDENS);
let marketplace = readData('marketplace.json', DEFAULT_MARKETPLACE);
let community = readData('community.json', DEFAULT_COMMUNITY);

// Simulated IoT Telemetry memory state
let simulatedSensor = {
  moisture: 42,
  temperature: 23.4,
  pH: 6.4,
  light: 78,
  autoIrrigation: false,
  timerId: null as NodeJS.Timeout | null
};

// Global tracker of current weather to influence IoT telemetry
let currentServerWeather = {
  temp: 18,
  condition: 'sunny',
  humidity: 62,
  wind: 12
};

// Periodic live sensor telemetry fluctuation based on weather condition
setInterval(() => {
  if (simulatedSensor.autoIrrigation) {
    if (simulatedSensor.moisture < 85) {
      simulatedSensor.moisture = Math.min(100, +(simulatedSensor.moisture + 3.0).toFixed(1));
    } else {
      simulatedSensor.autoIrrigation = false; // complete watering
    }
  } else {
    // naturally dry up based on weather
    let dryRate = 0.1;
    if (currentServerWeather.condition === 'heatwave' || currentServerWeather.temp > 30) {
      dryRate = 0.5; // dries extremely fast
    } else if (currentServerWeather.condition === 'sunny') {
      dryRate = 0.2;
    } else if (currentServerWeather.condition === 'rainy' || currentServerWeather.condition === 'storm') {
      // It's raining, moisture naturally rises up to 80%
      if (simulatedSensor.moisture < 80) {
        simulatedSensor.moisture = Math.min(80, +(simulatedSensor.moisture + 1.2).toFixed(1));
        dryRate = 0;
      } else {
        dryRate = 0.02; // slow drying if already saturated
      }
    } else if (currentServerWeather.condition === 'frost') {
      dryRate = 0.05; // very slow drying when freezing
    }
    
    if (dryRate > 0) {
      simulatedSensor.moisture = Math.max(10, +(simulatedSensor.moisture - dryRate).toFixed(1));
    }
  }

  // Temp fluctuates by small amount but centered around actual weather temp
  const hour = new Date().getHours();
  const weatherTemp = currentServerWeather.temp;
  // Soil is typically insulated, lags behind air temp slightly
  simulatedSensor.temperature = +(weatherTemp - 1.5 + Math.sin(Date.now() / 150000) * 1.5 + (Math.random() - 0.5) * 0.2).toFixed(1);
  
  // Light is based on weather condition and hour
  const isDay = hour > 6 && hour < 18;
  if (isDay) {
    if (currentServerWeather.condition === 'sunny' || currentServerWeather.condition === 'heatwave') {
      simulatedSensor.light = Math.min(100, Math.max(75, Math.floor(85 + (Math.random() - 0.5) * 10)));
    } else if (currentServerWeather.condition === 'cloudy' || currentServerWeather.condition === 'rainy') {
      simulatedSensor.light = Math.min(100, Math.max(25, Math.floor(40 + (Math.random() - 0.5) * 15)));
    } else if (currentServerWeather.condition === 'storm') {
      simulatedSensor.light = Math.min(100, Math.max(10, Math.floor(20 + (Math.random() - 0.5) * 8)));
    } else {
      simulatedSensor.light = Math.min(100, Math.max(30, Math.floor(50 + (Math.random() - 0.5) * 10)));
    }
  } else {
    simulatedSensor.light = Math.min(8, Math.max(1, Math.floor(3 + (Math.random() - 0.5) * 2)));
  }
}, 3000);

// Initialize Gemini Client
const ai = geminiClient;

// REST Endpoints
app.get('/api/crops', (req, res) => {
  res.json(CROPS);
});

// Gardens API
app.get('/api/gardens', (req, res) => {
  res.json(gardens);
});

app.post('/api/gardens', (req, res) => {
  const newGarden = req.body;
  if (!newGarden.id) {
    newGarden.id = 'garden-' + Date.now();
    newGarden.createdAt = new Date().toISOString();
    gardens.push(newGarden);
  } else {
    const idx = gardens.findIndex(g => g.id === newGarden.id);
    if (idx !== -1) {
      gardens[idx] = { ...gardens[idx], ...newGarden };
    } else {
      gardens.push(newGarden);
    }
  }
  writeData('gardens.json', gardens);
  res.status(201).json(newGarden);
});

// Marketplace API
app.get('/api/marketplace', (req, res) => {
  res.json(marketplace);
});

app.post('/api/marketplace', (req, res) => {
  const newItem = {
    id: 'item-' + Date.now(),
    dateAdded: new Date().toISOString(),
    ...req.body
  };
  marketplace.unshift(newItem);
  writeData('marketplace.json', marketplace);
  res.status(201).json(newItem);
});

// Community Feed API
app.get('/api/community', (req, res) => {
  res.json(community);
});

app.post('/api/community', (req, res) => {
  const newPost = {
    id: 'post-' + Date.now(),
    likes: 0,
    likedByUser: false,
    comments: [],
    date: new Date().toISOString(),
    ...req.body
  };
  community.unshift(newPost);
  writeData('community.json', community);
  res.status(201).json(newPost);
});

app.post('/api/community/:postId/like', (req, res) => {
  const { postId } = req.params;
  const post = community.find(p => p.id === postId);
  if (post) {
    if (post.likedByUser) {
      post.likes = Math.max(0, post.likes - 1);
      post.likedByUser = false;
    } else {
      post.likes += 1;
      post.likedByUser = true;
    }
    writeData('community.json', community);
    return res.json({ likes: post.likes, likedByUser: post.likedByUser });
  }
  res.status(404).json({ error: 'Post not found' });
});

app.post('/api/community/:postId/comments', (req, res) => {
  const { postId } = req.params;
  const { author, content } = req.body;
  const post = community.find(p => p.id === postId);
  if (post) {
    const newComment = {
      id: 'comment-' + Date.now(),
      author: author || 'Anonymous',
      content,
      date: new Date().toISOString()
    };
    post.comments.push(newComment);
    writeData('community.json', community);
    return res.status(201).json(newComment);
  }
  res.status(404).json({ error: 'Post not found' });
});

// Telemetry API
app.get('/api/sensors', (req, res) => {
  res.json({
    moisture: simulatedSensor.moisture,
    temperature: simulatedSensor.temperature,
    pH: simulatedSensor.pH,
    light: simulatedSensor.light,
    autoIrrigation: simulatedSensor.autoIrrigation
  });
});

app.post('/api/sensors/toggle-irrigation', (req, res) => {
  simulatedSensor.autoIrrigation = !simulatedSensor.autoIrrigation;
  res.json({ autoIrrigation: simulatedSensor.autoIrrigation });
});

app.post('/api/sensors/override', (req, res) => {
  const { moisture, temperature, pH, light } = req.body;
  if (moisture !== undefined) simulatedSensor.moisture = parseFloat(moisture);
  if (temperature !== undefined) {
    simulatedSensor.temperature = parseFloat(temperature);
    // Let overridden temperature temporarily guide currentServerWeather temperature too
    currentServerWeather.temp = parseFloat(temperature);
  }
  if (pH !== undefined) simulatedSensor.pH = parseFloat(pH);
  if (light !== undefined) simulatedSensor.light = parseFloat(light);
  res.json({ success: true, sensor: simulatedSensor });
});

// Weather API with live Open-Meteo synchronization and context-aware advice
app.get('/api/weather', async (req, res) => {
  const { lat, lon, city, county } = req.query;
  
  // Parse inputs (fallback to SF)
  const latitude = lat ? parseFloat(lat as string) : 37.7749;
  const longitude = lon ? parseFloat(lon as string) : -122.4194;
  const cityName = (city as string) || 'San Francisco';
  const countyName = (county as string) || 'San Francisco County';

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`;
    const response = await fetch(url, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) {
      throw new Error('Failed to fetch from Open-Meteo');
    }
    const data = await response.json();
    
    const currentTemp = data.current.temperature_2m;
    const currentHumidity = data.current.relative_humidity_2m;
    const currentWind = data.current.wind_speed_10m;
    const code = data.current.weather_code;

    // Condition mapping
    let condition: 'sunny' | 'rainy' | 'cloudy' | 'storm' | 'frost' | 'heatwave' = 'sunny';
    if (currentTemp > 30) {
      condition = 'heatwave';
    } else if (currentTemp < 5) {
      condition = 'frost';
    } else {
      if (code === 0 || code === 1 || code === 2) condition = 'sunny';
      else if (code === 3 || code === 45 || code === 48) condition = 'cloudy';
      else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) condition = 'rainy';
      else if ([71, 73, 75, 77, 85, 86].includes(code)) condition = 'frost';
      else if ([95, 96, 99].includes(code)) condition = 'storm';
    }

    // Update global server weather tracker so virtual sensors adapt
    currentServerWeather = {
      temp: currentTemp,
      condition,
      humidity: currentHumidity,
      wind: currentWind
    };

    // Format 6-day forecast
    const forecast = data.daily.time.slice(0, 6).map((timeStr: string, idx: number) => {
      const date = new Date(timeStr);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
      const maxTemp = data.daily.temperature_2m_max[idx];
      const minTemp = data.daily.temperature_2m_min[idx];
      const avgTemp = Math.round((maxTemp + minTemp) / 2);
      const dCode = data.daily.weather_code[idx];

      let dayCond: 'sunny' | 'rainy' | 'cloudy' | 'storm' | 'frost' | 'heatwave' = 'sunny';
      if (maxTemp > 30) {
        dayCond = 'heatwave';
      } else if (minTemp < 5) {
        dayCond = 'frost';
      } else {
        if (dCode === 0 || dCode === 1 || dCode === 2) dayCond = 'sunny';
        else if (dCode === 3 || dCode === 45 || dCode === 48) dayCond = 'cloudy';
        else if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(dCode)) dayCond = 'rainy';
        else if ([71, 73, 75, 77, 85, 86].includes(dCode)) dayCond = 'frost';
        else if ([95, 96, 99].includes(dCode)) dayCond = 'storm';
      }

      return {
        day: dayName,
        temp: avgTemp,
        condition: dayCond
      };
    });

    // Smart context-aware weather advice / alerts
    let alerts: any[] = [];
    
    // Attempt to call Gemini if available for highly specific micro-climate warnings
    if (ai) {
      try {
        const prompt = `Act as an expert agricultural climate risk system. Analyze current climate conditions for a garden at:
Location: ${cityName}, ${countyName}
Weather: Temp ${currentTemp}°C, Condition: ${condition}, Humidity: ${currentHumidity}%, Wind: ${currentWind} km/h.
IoT Soil Sensors: moisture: ${simulatedSensor.moisture}%, soil temp: ${simulatedSensor.temperature}°C, pH: ${simulatedSensor.pH}, light: ${simulatedSensor.light}%.

Provide exactly ONE highly targeted, urgent climate alert with actionable, advanced, specific advice for this micro-climate.
Respond in strict, valid JSON format, with no markdown backticks, matching this exact object schema:
{
  "id": "alert-id-string",
  "severity": "info" | "warning" | "critical",
  "title": "Clear, informative alert title",
  "description": "Specific micro-climate concern detailed description",
  "advice": "Specific companion plant protective tips or structural actions to mitigate"
}`;
        
        const response = await generateContentWithFallback(ai, {
          model: 'gemini-3.5-flash',
          contents: [{ text: prompt }],
          config: { responseMimeType: 'application/json' }
        });
        
        const parsedAlert = JSON.parse(response.text || '{}');
        if (parsedAlert && parsedAlert.title) {
          alerts.push(parsedAlert);
        }
      } catch (geminiErr: any) {
        console.log('Gemini weather advice failed, using fallback warnings:', geminiErr.message || geminiErr);
      }
    }

    // Fallbacks if Gemini failed or is not initialized
    if (alerts.length === 0) {
      if (condition === 'heatwave') {
        alerts.push({
          id: 'alert-heat-fallback',
          severity: 'critical',
          title: 'Extreme Heat Stress Advisory',
          description: `Vapor pressure deficits are spiking in ${cityName} with temperatures at ${currentTemp}°C. High evapotranspiration risk detected.`,
          advice: 'Water roots deeply before dawn. Erect 40% shade cloths over nightshades and brassicas. Mulch heavily to retain moisture.'
        });
      } else if (condition === 'frost' || currentTemp < 10) {
        alerts.push({
          id: 'alert-frost-fallback',
          severity: 'critical',
          title: 'Sub-Optimal Low Temperature Alert',
          description: `Chilly frost threats present in ${cityName} with temperatures dipping to ${currentTemp}°C. Root respiration is slowing down.`,
          advice: 'Lay down horticultural row cover blankets immediately. Protect tomato/pepper seedlings. Avoid watering in late afternoons to prevent soil ice-over.'
        });
      } else if (condition === 'storm') {
        alerts.push({
          id: 'alert-storm-fallback',
          severity: 'warning',
          title: 'Active Storm / Wind Damage Threat',
          description: `Severe squalls and high soil sat threats forecast for ${cityName} with wind speed at ${currentWind} km/h.`,
          advice: 'Stake tall crop species such as heirloom tomatoes and corn. Ensure storm gutters and raised bed outflows are clear to prevent waterlogging.'
        });
      } else if (simulatedSensor.moisture < 35) {
        alerts.push({
          id: 'alert-dry-fallback',
          severity: 'warning',
          title: 'Immediate Soil Irrigation Required',
          description: `Sub-surface root systems are experiencing moisture starvation. Current moisture level is at ${simulatedSensor.moisture}%.`,
          advice: 'Engage micro-irrigation system now. Add composted mulches to slow moisture loss.'
        });
      } else {
        alerts.push({
          id: 'alert-normal-fallback',
          severity: 'info',
          title: 'Optimal Growing Windows Active',
          description: `Favorable atmospheric vectors in ${cityName} with stable ${currentTemp}°C temperatures and ${currentHumidity}% humidity.`,
          advice: 'Perfect timing for light foliage pruning of nightshades. Verify marigold boundaries are clean to repel early season flea beetles.'
        });
      }
    }

    res.json({
      temp: currentTemp,
      condition,
      humidity: currentHumidity,
      wind: currentWind,
      forecast,
      alerts
    });

  } catch (error: any) {
    console.error('Failed to resolve dynamic live weather metrics:', error);
    // Return high quality fallback
    res.json({
      temp: 18,
      condition: 'sunny',
      humidity: 62,
      wind: 12,
      forecast: [
        { day: 'Mon', temp: 19, condition: 'sunny' },
        { day: 'Tue', temp: 22, condition: 'sunny' },
        { day: 'Wed', temp: 24, condition: 'cloudy' },
        { day: 'Thu', temp: 21, condition: 'rainy' },
        { day: 'Fri', temp: 17, condition: 'storm' },
        { day: 'Sat', temp: 15, condition: 'frost' }
      ],
      alerts: [{
        id: 'alert-fallback-error',
        severity: 'info',
        title: 'Weather Service Running in Safe Mode',
        description: 'Unable to connect to Open-Meteo live API. Running simulation fallbacks.',
        advice: 'Verify network credentials. Telemetry continues to operate securely in-memory.'
      }]
    });
  }
});

// AI Credits and Rate Limiting Helper
interface UsageRecord {
  timestamp: string;
  action: string;
}

const getAiCredits = (): { remaining: number; total: number; used: number } => {
  const usage = readData<{ requests: UsageRecord[] }>('ai_usage.json', { requests: [] });
  const totalLimit = 15;
  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;
  // Filter for requests within the last 24 hours
  const recentRequests = usage.requests.filter(r => (now - new Date(r.timestamp).getTime()) < oneDayMs);
  
  // Prune expired records to prevent file growth
  if (recentRequests.length !== usage.requests.length) {
    writeData('ai_usage.json', { requests: recentRequests });
  }

  const used = recentRequests.length;
  const remaining = Math.max(0, totalLimit - used);
  return { remaining, total: totalLimit, used };
};

const incrementAiCredits = (action: string): boolean => {
  const credits = getAiCredits();
  if (credits.remaining <= 0) {
    return false;
  }
  const usage = readData<{ requests: UsageRecord[] }>('ai_usage.json', { requests: [] });
  usage.requests.push({
    timestamp: new Date().toISOString(),
    action
  });
  writeData('ai_usage.json', usage);
  return true;
};

// AI Credits API
app.get('/api/ai-credits', (req, res) => {
  res.json(getAiCredits());
});

// AI Weekly Tasks Generator Route
app.post('/api/generate-tasks', async (req, res) => {
  const { userProfile, weather } = req.body;
  
  const credits = getAiCredits();
  if (credits.remaining <= 0) {
    return res.status(429).json({ 
      error: 'AI request limit reached', 
      message: 'You have reached the daily limit of 15 requests. Please upgrade to GrowLocal AI Premium for unlimited calendar task generations.' 
    });
  }
  incrementAiCredits('generate-tasks');

  const prompt = `Based on this user's gardening profile:
- Experience: ${userProfile?.experience || 'Intermediate'}
- Size: ${userProfile?.gardenSize || '45'} sq ft
- Location: ${userProfile?.location || 'San Francisco'}
- Goal: ${userProfile?.primaryGoal || 'Pest resistance'}
Current weather temperature is ${weather?.temp || 18}°C and conditions are ${weather?.condition || 'sunny'}.

Generate a list of 4 highly actionable, specific gardening tasks for the upcoming week.
Format your response as a clean, valid JSON array of objects, with no extra text or markdown codeblock backticks, so we can parse it directly. Each object must have these keys:
- "id": a short unique string (e.g., "task-1")
- "title": a clear actionable title (max 45 chars)
- "description": details including any specific companion plants or remedies (max 150 chars)
- "day": a suggested day of the week (e.g. "Monday")
- "category": one of "Watering" | "Pest Control" | "Companion Planting" | "Soil Health" | "Climate Safeguard"

Example format:
[
  { "id": "task-1", "title": "Tomatoes companion support", "description": "Plant french marigold seedlings near tomato coordinates to secrete alpha-terthienyl compounds.", "day": "Monday", "category": "Companion Planting" }
]`;

  if (!ai) {
    const mockTasks = [
      {
        id: 'ai-task-1',
        title: 'Deep morning soak for nightshades',
        description: 'Water tomatoes and peppers at base for 15 minutes before 8 AM. Avoid leaf humidity to prevent early blight.',
        day: 'Monday',
        category: 'Watering'
      },
      {
        id: 'ai-task-2',
        title: 'Introduce marigold border guards',
        description: 'Plant french marigold seedlings near tomato coordinates to secrete alpha-terthienyl compounds and repel thrips.',
        day: 'Wednesday',
        category: 'Companion Planting'
      },
      {
        id: 'ai-task-3',
        title: 'Apply neem oil solution on soft herbs',
        description: 'Check basil leaves for aphids. Spray 1% organic cold-pressed neem oil mixture in evening to safeguard foliage.',
        day: 'Thursday',
        category: 'Pest Control'
      },
      {
        id: 'ai-task-4',
        title: 'Mulch lettuce rows for moisture lock',
        description: 'With temperatures around 18°C, apply 2 inches of clean straw mulch over brassicas and leaf greens to preserve moisture.',
        day: 'Saturday',
        category: 'Soil Health'
      }
    ];
    return res.json({ tasks: mockTasks });
  }

  try {
    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: {
        responseMimeType: 'application/json'
      }
    });

    const parsed = JSON.parse(response.text || '[]');
    res.json({ tasks: parsed });
  } catch (err: any) {
    console.log('AI generate tasks failed:', err.message || err);
    res.json({
      tasks: [
        {
          id: 'err-task-1',
          title: 'Prune tomato suckers',
          description: 'Pinch off non-fruiting tomato suckers from leaf joints to optimize sunlight penetration and air ventilation.',
          day: 'Tuesday',
          category: 'Climate Safeguard'
        },
        {
          id: 'err-task-2',
          title: 'Aerate soil with organic compost',
          description: 'Gently cultivate the top 2 inches of soil around chives and rosemary; top-dress with 1 inch of premium castings.',
          day: 'Thursday',
          category: 'Soil Health'
        }
      ]
    });
  }
});

// Secure AI Chat Route via Gemini
app.post('/api/chat', async (req, res) => {
  const { messages, userProfile } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    console.error('Invalid request body for /api/chat: messages array is required');
    return res.status(400).json({ error: 'Invalid messages list' });
  }

  const credits = getAiCredits();
  if (credits.remaining <= 0) {
    console.warn('AI credit limit reached for chat request');
    return res.status(429).json({ 
      error: 'AI request limit reached', 
      message: 'You have reached the daily limit of 15 requests for free users. Please upgrade to GrowLocal AI Premium for unlimited horticultural simulations and real-time vision!' 
    });
  }
  incrementAiCredits('chat');

  console.log(`[AI Chat] Processing query. Messages count: ${messages.length}. Garden Size: ${userProfile?.gardenSize || 'default'}`);

  // Use simulation/demo mode if AI client is null or key is missing
  if (!ai) {
    console.warn('[AI Chat] Gemini client is not initialized (GEMINI_API_KEY missing/invalid). Replying in simulation mode.');
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    
    let mockReply = `### 🌿 GrowLocal AI Advisor (Simulation Mode)

I am currently running in offline demo mode because **GEMINI_API_KEY** is not configured. 

**How to activate:**
1. Open the **Settings > Secrets** panel in AI Studio.
2. Add your \`GEMINI_API_KEY\` value.
3. Once active, I can perform deep cognitive agronomical reasoning for your **${userProfile?.gardenSize || '45'} sq ft** garden!

**Your prompt was:** "${lastUserMessage}"

**Simulated Agronomic Advice:**
*   **Companion Planting Insight**: Since your goal is *${userProfile?.primaryGoal || 'high yield and pest control'}*, we recommend pairing **Tomatoes** with **Basil** and **Marigolds**. Marigold roots emit alpha-terthienyl which inhibits parasitic root-knot nematodes, while basil keeps flies and mosquitoes at bay.
*   **Actionable Task**: Water your plants deeply at their base early in the morning (6 AM to 8 AM) to avoid leaf humidity, which prevents powdery mildew.

*Would you like me to show you how to plant cover crops for the winter?*`;
    return res.json({ text: mockReply });
  }

  const promptContext = `You are GrowLocal AI, a high-fidelity expert agronomist, horticultural advisor, and urban resilience planner.
Your target user has this profile:
- Experience Level: ${userProfile?.experience || 'Beginner'}
- Micro-Garden Size: ${userProfile?.gardenSize || '40'} sq ft
- Geographic Location: ${userProfile?.location || 'San Francisco'}
- Goal: ${userProfile?.primaryGoal || 'High yield, organic companion gardening'}

Rules:
1. Provide highly practical, scientifically valid advice.
2. Mention specific companion planting practices where helpful.
3. Keep the advice readable, with clear headings and bullet points. Do not speak in empty generalities.
4. If they talk about pests or issues, offer concrete organically approved treatments (e.g. neem oil, soapy spray, beneficial nematodes, companion repellers like marigolds or garlic).
5. Ensure answers fit within our micro-farming domain. Raise awareness on food sovereignty and sustainability.`;

  try {
    // Only send messages starting from the first user turn to ensure valid multi-turn structure (must start with 'user')
    const firstUserIndex = messages.findIndex(msg => msg.role === 'user');
    const chatHistory = firstUserIndex !== -1 ? messages.slice(firstUserIndex) : messages;

    const formattedContents = chatHistory.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    console.log('[AI Chat] Sending contents to GoogleGenAI:', JSON.stringify(formattedContents));

    const response = await generateContentWithFallback(ai, {
      model: GEMINI_MODEL,
      contents: formattedContents,
      config: {
        systemInstruction: promptContext,
        temperature: 0.7
      }
    });

    console.log('[AI Chat] Gemini API response successfully received.');
    res.json({ text: response.text });
  } catch (err: any) {
    console.log('Gemini Chat Error:', err.message || err);
    res.status(500).json({ 
      error: 'AI advisor failed to generate advice', 
      message: err.message || 'Unknown Gemini API validation or authorization error'
    });
  }
});

// Secure AI Diagnose Route (Multimodal Vision)
app.post('/api/diagnose', async (req, res) => {
  const { base64Image, mimeType, cropName } = req.body;

  if (!base64Image || !mimeType) {
    return res.status(400).json({ error: 'Missing image data or mimeType' });
  }

  const credits = getAiCredits();
  if (credits.remaining <= 0) {
    return res.status(429).json({ 
      error: 'AI request limit reached', 
      message: 'You have reached the daily limit of 15 requests for free users. Please upgrade to GrowLocal AI Premium for unlimited horticultural simulations and real-time vision!' 
    });
  }
  incrementAiCredits('diagnose');

  const prompt = `Analyze this plant leaf or crop sample.
Crop type is listed as: ${cropName || 'Unknown Garden Plant'}.
Identify potential:
1. Disease, fungal, bacterial infection or pest damage.
2. Confidence score of your diagnosis.
3. Primary Symptoms visible.
4. Organic & chemical treatment options.
5. Preventative strategies for next season.

Please structure your response beautifully with markdown headers and lists. Use professional, reassuring, and precise agronomic language.`;

  if (!ai) {
    // Provide gorgeous mock diagnosis based on selected/uploaded crop type
    let mockDiagnosis = `### 🔍 Plant Health Diagnosis Report (Demo Mode)

**Diagnosis**: Early Blight (*Alternaria solani*) suspect
**Confidence**: 85% (Simulated)

#### 📋 Observed Symptoms:
*   Concentric circular black spot "target-like" lesions on older, lower leaves.
*   Yellow chlorotic halos surrounding lesions, slowly expanding.
*   Minor stem speckling, suggesting high local humidity.

#### 🛡️ Organic Treatment Plan:
1.  **Surgical Pruning**: Immediately prune and destroy infected bottom foliage. Do NOT compost.
2.  **Organic Fungicide**: Spray copper-octanoate or Bacillus subtilis-based organic fungicide every 7 days.
3.  **Watering Protocol**: Transition strictly to drip irrigation or soil-level watering. Dry foliage is critical!

#### 🌿 Preventative Actions:
*   Ensure 24-inch spacing next season to enhance cross-ventilation.
*   Companion plant with **Garlic** and **Chives** which secrete sulfur compounds acting as systemic protection.`;

    return res.json({ text: mockDiagnosis });
  }

  try {
    const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: [
        {
          inlineData: {
            mimeType: mimeType,
            data: cleanBase64
          }
        },
        { text: prompt }
      ]
    });

    res.json({ text: response.text });
  } catch (err: any) {
    console.log('Gemini Vision Diagnose Error:', err.message || err);
    res.status(500).json({ error: 'Vision diagnosis failed: ' + err.message });
  }
});

// AI Progress Journal Insights Route
app.post('/api/analyze-journal', async (req, res) => {
  const { title, content, weather, userProfile } = req.body;

  const credits = getAiCredits();
  if (credits.remaining <= 0) {
    return res.status(429).json({ 
      error: 'AI request limit reached', 
      message: 'You have reached the daily limit of 15 requests. Please upgrade to GrowLocal AI Premium for unlimited journal insights.' 
    });
  }
  incrementAiCredits('analyze-journal');

  const prompt = `You are the GrowLocal AI Horticultural Journal Analyst.
An urban gardener has logged this journal entry:
Title: ${title}
Content: ${content}
Today's local weather logged: ${weather || 'sunny'}
User profile context: garden size ${userProfile?.gardenSize || '45'} sq ft, experience: ${userProfile?.experience || 'Beginner'}, focus goal: ${userProfile?.primaryGoal || 'High yield'}.

Provide a highly personalized, expert, encouraging analysis (max 150 words) including:
1. Agronomist assessment of current milestones or warnings.
2. 2-3 bulleted actionable organic suggestions to maximize yields or prevent pests based on their focus goal.
Format beautifully using markdown.`;

  if (!ai) {
    const mockInsight = `### 🌿 GrowLocal AI Journal Insights (Demo Mode)

Your log **"${title}"** indicates excellent proactive management! Top-dressing with premium castings is highly beneficial.

*   **Nitrogen Supply Alert**: If bottom leaves show light chlorosis (yellowing), this is a common indicator of a nitrogen draw-down. Top-dress with high-nitrogen organic amendments (like bat guano or blood meal) or a seaweed foliar spray.
*   **Root Aeration**: Ensure the top 2 inches of compost remain loose. This prevents local compaction and boosts photosynthetic root efficiency.`;
    return res.json({ text: mockInsight });
  }

  try {
    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }]
    });
    res.json({ text: response.text });
  } catch (err: any) {
    console.log('Journal analysis failed:', err.message || err);
    res.status(500).json({ error: 'AI journal insights failed to generate.' });
  }
});

// AI Daily Briefing Route
app.post('/api/daily-briefing', async (req, res) => {
  const { userProfile, weather, telemetry } = req.body;
  
  const credits = getAiCredits();
  if (credits.remaining <= 0) {
    return res.status(429).json({ 
      error: 'AI request limit reached', 
      message: 'You have reached the daily limit of 15 requests. Please upgrade to GrowLocal AI Premium.' 
    });
  }
  incrementAiCredits('daily-briefing');

  const prompt = `Based on this user's profile:
- Name: ${userProfile?.name || 'Elena'}
- Goal: ${userProfile?.primaryGoal || 'High yield'}
- Size: ${userProfile?.gardenSize || 45} sq ft
- Experience: ${userProfile?.experience || 'Intermediate'}

And current environmental metrics:
- Location: ${userProfile?.location || 'San Francisco'}
- Weather: Temp ${weather?.temp || 18}°C, Condition: ${weather?.condition || 'sunny'}
- Soil Moisture: ${telemetry?.moisture || 42}%
- Soil Temp: ${telemetry?.temperature || 23.4}°C
- Soil pH: ${telemetry?.pH || 6.4}
- Light: ${telemetry?.light || 78}%

Generate a concise, highly personalized daily briefing (approx. 50-70 words) for the gardener, and list 3-4 specific quick action items.
Format your response as a valid JSON object (no markdown backticks) with keys:
- "summary": "The briefing text..."
- "quickActions": ["Action 1...", "Action 2...", "Action 3..."]`;

  if (!ai) {
    return res.json({
      summary: `Hello ${userProfile?.name || 'Elena'}! Your garden in ${userProfile?.location || 'San Francisco'} is in excellent health today. With a comfortable temperature of ${weather?.temp || 18}°C and optimal soil moisture of ${telemetry?.moisture || 42}%, your plants are primed for vigorous vegetative growth. Soil pH (${telemetry?.pH || 6.4}) is in the sweet spot for your nightshades.`,
      quickActions: [
        "Lightly aerate the soil around brassicas to boost root respiration.",
        "Verify companion marigold roots are clear of dry weed debris.",
        "Check lower tomato leaves for initial signs of early blight."
      ]
    });
  }

  try {
    const response = await generateContentWithFallback(ai, {
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: { responseMimeType: 'application/json' }
    });
    const parsed = JSON.parse(response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.log('AI Daily briefing generation failed:', err.message || err);
    res.json({
      summary: `Hello ${userProfile?.name || 'Elena'}! Your garden in ${userProfile?.location || 'San Francisco'} is in excellent health today. Keep up the organic gardening practices!`,
      quickActions: [
        "Monitor soil moisture levels after midday heat.",
        "Apply a organic neem solution if pests appear.",
        "Harvest mature herbs to stimulate new growth."
      ]
    });
  }
});

// Serve Vite dev server or built static files
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GrowLocal AI custom server started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
