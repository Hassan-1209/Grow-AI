import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, CloudSun, Droplets, Thermometer, Sun, 
  Activity, ShieldAlert, Sparkles, Plus, Calendar, 
  Leaf, ArrowRight, Save, UserCheck, RefreshCw, Eye, Check,
  MapPin, Globe, Navigation, Search, Trash2, Flame,
  TrendingUp, Cpu, Sliders, Settings2, CheckSquare, Clock, Bot
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { SensorTelemetry, UserProfile, WeatherData } from '../types';

interface DashboardViewProps {
  userProfile: UserProfile;
  setUserProfile: (profile: UserProfile) => void;
  weather: WeatherData | null;
  onNavigate: (view: string) => void;
  onRefreshCredits?: () => void;
  aiCredits?: { remaining: number; total: number; used: number };
  currentLocation: {
    name: string;
    city: string;
    county: string;
    country: string;
    lat: number;
    lon: number;
  };
  setCurrentLocation: (loc: any) => void;
  savedLocations: Array<{
    name: string;
    city: string;
    county: string;
    country: string;
    lat: number;
    lon: number;
  }>;
  setSavedLocations: React.Dispatch<React.SetStateAction<Array<{
    name: string;
    city: string;
    county: string;
    country: string;
    lat: number;
    lon: number;
  }>>>;
  fetchLiveWeather: (loc: any) => Promise<void>;
}

export default function DashboardView({ 
  userProfile, 
  setUserProfile, 
  weather, 
  onNavigate,
  onRefreshCredits,
  aiCredits,
  currentLocation,
  setCurrentLocation,
  savedLocations,
  setSavedLocations,
  fetchLiveWeather
}: DashboardViewProps) {
  // Virtual IoT Telemetry State
  const [telemetry, setTelemetry] = useState<SensorTelemetry>({
    timestamp: new Date().toLocaleTimeString(),
    moisture: 42,
    temperature: 23.4,
    pH: 6.4,
    light: 78
  });
  
  const [isIrrigating, setIsIrrigating] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>({ ...userProfile });
  const [activeSensorChart, setActiveSensorChart] = useState<'moisture' | 'temperature' | 'pH' | 'light' | null>('moisture');
  const [activeResilienceTab, setActiveResilienceTab] = useState<'overall' | 'biodiversity' | 'water' | 'climate'>('overall');

  // Search & Geocoding States
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [showSaveNicknameModal, setShowSaveNicknameModal] = useState(false);
  const [newLocationNickname, setNewLocationNickname] = useState('');

  // AI Daily Briefing State
  const [briefing, setBriefing] = useState<{ summary: string; quickActions: string[] } | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  // Smart Weekly Tasks State
  const [tasks, setTasks] = useState<Array<{
    id: string;
    title: string;
    description: string;
    day: string;
    category: string;
    completed: boolean;
  }>>([
    {
      id: 'task-1',
      title: 'Aerate soil beds',
      description: 'Gently cultivate surface soil crust near nightshades to boost root system oxygen absorption before peak sun.',
      day: 'Monday',
      category: 'Soil Health',
      completed: false
    },
    {
      id: 'task-2',
      title: 'Moisture deep-soak at base',
      description: 'Crops need deep base watering today. Avoid overhead sprinkling to prevent powdery mildew.',
      day: 'Wednesday',
      category: 'Watering',
      completed: false
    },
    {
      id: 'task-3',
      title: 'Pest check & companion review',
      description: 'Inspect tomato leaves for aphids and check marigold companion flower margins.',
      day: 'Friday',
      category: 'Pest Control',
      completed: false
    }
  ]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Fetch telemetry on mount and interval
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/sensors');
      if (res.ok) {
        const data = await res.json();
        setTelemetry({
          timestamp: new Date().toLocaleTimeString(),
          moisture: data.moisture,
          temperature: data.temperature,
          pH: data.pH,
          light: data.light
        });
        setIsIrrigating(data.autoIrrigation);
      }
    } catch (err) {
      console.error('Failed to fetch sensor telemetry:', err);
    }
  };

  // Fetch Daily Briefing
  const fetchDailyBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const res = await fetch('/api/daily-briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, weather, telemetry })
      });
      if (res.ok) {
        const data = await res.json();
        setBriefing(data);
      }
    } catch (err) {
      console.error('Failed to fetch daily briefing:', err);
    } finally {
      setLoadingBriefing(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (weather) {
      fetchDailyBriefing();
    }
  }, [weather, currentLocation, telemetry.moisture, telemetry.temperature]);

  // Debounced geocoding location search
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=en&format=json`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.results || []);
        }
      } catch (err) {
        console.error('Error fetching geocoding suggestions:', err);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`);
          if (res.ok) {
            const data = await res.json();
            const city = data.city || data.locality || 'Detected City';
            const county = data.principalSubdivision || data.localityInfo?.administrative?.[1]?.name || 'Local County';
            const country = data.countryName || 'United States';
            
            const newLoc = {
              name: `Live: ${city}`,
              city,
              county,
              country,
              lat: latitude,
              lon: longitude
            };
            setCurrentLocation(newLoc);
            if (!savedLocations.some(l => l.city.toLowerCase() === city.toLowerCase())) {
              setSavedLocations(prev => [newLoc, ...prev]);
            }
          }
        } catch (err) {
          console.error('Error in reverse geocoding:', err);
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        console.error('Geolocation failed:', error);
        setDetecting(false);
      }
    );
  };

  const handleSaveCurrentLocation = () => {
    if (!newLocationNickname.trim()) return;
    const isDuplicate = savedLocations.some(l => l.name.toLowerCase() === newLocationNickname.toLowerCase());
    if (isDuplicate) {
      alert('A location with this name already exists.');
      return;
    }
    const locToSave = {
      ...currentLocation,
      name: newLocationNickname.trim()
    };
    setSavedLocations(prev => [...prev, locToSave]);
    setCurrentLocation(locToSave);
    setNewLocationNickname('');
    setShowSaveNicknameModal(false);
  };

  const handleDeleteSavedLocation = (nameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (savedLocations.length <= 1) {
      alert('You must have at least one saved location.');
      return;
    }
    const updated = savedLocations.filter(l => l.name !== nameToDelete);
    setSavedLocations(updated);
    if (currentLocation.name === nameToDelete) {
      setCurrentLocation(updated[0]);
    }
  };

  const handleToggleIrrigation = async () => {
    try {
      const res = await fetch('/api/sensors/toggle-irrigation', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setIsIrrigating(data.autoIrrigation);
        fetchTelemetry();
      }
    } catch (err) {
      console.error('Irrigation toggle failed:', err);
    }
  };

  const handleSensorOverride = async (type: 'moisture' | 'temperature' | 'pH' | 'light', value: number) => {
    setTelemetry(prev => ({ ...prev, [type]: value }));
    try {
      await fetch('/api/sensors/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [type]: value })
      });
    } catch (err) {
      console.error('Failed to post sensor override:', err);
    }
  };

  const handleGenerateTasks = async () => {
    setGeneratingTasks(true);
    setGenerationError(null);
    try {
      const res = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userProfile, weather })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.tasks) {
          const formatted = data.tasks.map((t: any) => ({ ...t, completed: false }));
          setTasks(formatted);
          if (onRefreshCredits) onRefreshCredits();
        } else {
          setGenerationError('Failed to format generated tasks.');
        }
      } else if (res.status === 429) {
        const data = await res.json();
        setGenerationError(data.message || 'AI request limit reached for today.');
      } else {
        setGenerationError('Failed to generate automatic tasks.');
      }
    } catch (err) {
      console.error('Failed to generate automatic AI tasks:', err);
      setGenerationError('Server connection issue while generating tasks.');
    } finally {
      setGeneratingTasks(false);
    }
  };

  const handleToggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleSaveProfile = () => {
    setUserProfile(editedProfile);
    setIsEditingProfile(false);
  };

  // Helper metrics
  const estimatedYieldPerYear = userProfile.gardenSize * 4.2;
  const carbonOffsetKg = +(estimatedYieldPerYear * 1.6).toFixed(1);

  // Gauge scoring variables
  const biodiversityScore = 92;
  const waterEfficiencyScore = Math.max(30, Math.min(100, Math.round(100 - Math.abs(telemetry.moisture - 55) * 1.5)));
  const climateReadinessScore = weather?.condition === 'sunny' ? 88 : weather?.condition === 'rainy' ? 94 : 76;
  const averageResilienceScore = Math.round((biodiversityScore + waterEfficiencyScore + climateReadinessScore) / 3);

  // Status mappings
  const getMoistureStatus = (val: number) => {
    if (val < 35) return { text: 'Critical Dry', color: 'text-red-500 border-red-200 bg-red-500/5' };
    if (val > 80) return { text: 'Waterlogged', color: 'text-amber-500 border-amber-200 bg-amber-500/5' };
    return { text: 'Optimal', color: 'text-emerald-500 border-emerald-200 bg-emerald-500/5' };
  };

  const getTempStatus = (val: number) => {
    if (val < 10) return { text: 'Frost Risk', color: 'text-sky-500 border-sky-200 bg-sky-500/5' };
    if (val > 30) return { text: 'Heat stress', color: 'text-red-500 border-red-200 bg-red-500/5' };
    return { text: 'Optimal Room', color: 'text-emerald-500 border-emerald-200 bg-emerald-500/5' };
  };

  const getPHStatus = (val: number) => {
    if (val < 6.0) return { text: 'Slightly Acidic', color: 'text-amber-500 border-amber-200 bg-amber-500/5' };
    if (val > 7.2) return { text: 'Alkaline Soil', color: 'text-blue-500 border-blue-200 bg-blue-500/5' };
    return { text: 'Perfect Neutral', color: 'text-emerald-500 border-emerald-200 bg-emerald-500/5' };
  };

  const getLightStatus = (val: number) => {
    if (val < 25) return { text: 'Low Light', color: 'text-slate-400 border-slate-200 bg-slate-500/5' };
    if (val > 70) return { text: 'Optimal PAR', color: 'text-emerald-500 border-emerald-200 bg-emerald-500/5' };
    return { text: 'Medium Light', color: 'text-amber-500 border-amber-200 bg-amber-500/5' };
  };

  // Weather styling helper
  const getWeatherTheme = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return {
          gradient: 'from-amber-50/80 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/5',
          border: 'border-amber-150',
          text: 'text-amber-800',
          badge: 'bg-amber-100 text-amber-800',
          icon: '☀️',
          bgStyle: 'radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(255,255,255,0) 70%)'
        };
      case 'heatwave':
        return {
          gradient: 'from-orange-50/80 to-red-50/50 dark:from-orange-950/10 dark:to-red-950/5',
          border: 'border-orange-150',
          text: 'text-red-800',
          badge: 'bg-orange-100 text-red-800',
          icon: '🔥',
          bgStyle: 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(255,255,255,0) 70%)'
        };
      case 'rainy':
        return {
          gradient: 'from-blue-50/80 to-sky-50/50 dark:from-blue-950/10 dark:to-sky-950/5',
          border: 'border-blue-150',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800',
          icon: '🌧️',
          bgStyle: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(255,255,255,0) 70%)'
        };
      case 'storm':
        return {
          gradient: 'from-purple-50/80 to-slate-50/50 dark:from-purple-950/10 dark:to-slate-950/5',
          border: 'border-purple-150',
          text: 'text-purple-800',
          badge: 'bg-purple-100 text-purple-800',
          icon: '⚡',
          bgStyle: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, rgba(255,255,255,0) 70%)'
        };
      case 'frost':
        return {
          gradient: 'from-cyan-50/80 to-blue-50/50 dark:from-cyan-950/10 dark:to-blue-950/5',
          border: 'border-cyan-150',
          text: 'text-sky-800',
          badge: 'bg-cyan-100 text-sky-800',
          icon: '❄️',
          bgStyle: 'radial-gradient(circle, rgba(6,182,212,0.15) 0%, rgba(255,255,255,0) 70%)'
        };
      case 'cloudy':
      default:
        return {
          gradient: 'from-slate-50/80 to-emerald-50/30 dark:from-slate-900/10 dark:to-emerald-950/5',
          border: 'border-gray-150',
          text: 'text-emerald-800',
          badge: 'bg-emerald-100 text-emerald-800',
          icon: '☁️',
          bgStyle: 'radial-gradient(circle, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0) 70%)'
        };
    }
  };

  const weatherTheme = getWeatherTheme(weather?.condition || 'sunny');

  // Dynamic hourly charts mapping
  const sensorHistory = generateHourlyHistory(
    activeSensorChart === 'moisture' ? telemetry.moisture :
    activeSensorChart === 'temperature' ? telemetry.temperature :
    activeSensorChart === 'pH' ? telemetry.pH : telemetry.light,
    activeSensorChart || 'moisture'
  );

  // Resilience score progression
  const resilienceTrendData = [
    { month: 'Jan', resilience: 72, biodiversity: 80, water: 65, readiness: 70 },
    { month: 'Feb', resilience: 75, biodiversity: 82, water: 68, readiness: 75 },
    { month: 'Mar', resilience: 79, biodiversity: 85, water: 72, readiness: 80 },
    { month: 'Apr', resilience: 81, biodiversity: 88, water: 74, readiness: 82 },
    { month: 'May', resilience: 84, biodiversity: 90, water: 77, readiness: 85 },
    { month: 'Jun', resilience: averageResilienceScore, biodiversity: biodiversityScore, water: waterEfficiencyScore, readiness: climateReadinessScore }
  ];

  function generateHourlyHistory(currentVal: number, type: string) {
    const points = [];
    const hours = ['02:00', '04:00', '06:00', '08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00', '24:00'];
    for (let i = 0; i < hours.length; i++) {
      let offset = 0;
      if (type === 'light') {
        const h = parseInt(hours[i].split(':')[0]);
        if (h > 6 && h < 18) {
          offset = Math.sin((h - 6) / 12 * Math.PI) * 40;
        } else {
          offset = -currentVal + 1.5;
        }
      } else if (type === 'temperature') {
        const h = parseInt(hours[i].split(':')[0]);
        offset = Math.sin((h - 8) / 12 * Math.PI) * 3.5;
      } else {
        offset = Math.sin(i / 1.5) * 3.8;
      }
      points.push({
        time: hours[i],
        value: Math.max(1, Math.min(100, +(currentVal + offset).toFixed(1)))
      });
    }
    return points;
  }

  return (
    <div className="space-y-8 pb-12">
      {/* 1. Welcome & Streak Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-linear-to-r from-emerald-950 to-teal-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-2 max-w-xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
              <Sparkles className="w-3 h-3 text-emerald-400" /> Active Companion Sown
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/20">
              <Flame className="w-3 h-3 text-amber-400 animate-pulse" /> 7-Day Growing Streak
            </span>
          </div>
          <h1 id="welcome-header-title" className="text-3xl md:text-4xl font-sans font-extrabold tracking-tight">
            Welcome back, {userProfile.name}
          </h1>
          <p className="text-emerald-100/85 text-xs md:text-sm leading-relaxed">
            Your rooftop haven, <span className="font-semibold text-emerald-300">"{userProfile.name}'s Oasis"</span>, is synchronized with local microclimatic forecasts.
          </p>
        </div>

        {/* Action Quick-Links */}
        <div className="flex flex-wrap gap-3 relative z-10 w-full lg:w-auto">
          <button 
            id="btn-nav-planner"
            onClick={() => onNavigate('planner')}
            className="flex-1 lg:flex-none px-5 py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white rounded-xl font-semibold text-xs transition-all cursor-pointer shadow-lg shadow-emerald-950/20 flex items-center justify-center gap-2"
          >
            <Sprout className="w-4 h-4" /> Garden Planner
          </button>
          <button 
            id="btn-nav-advisor"
            onClick={() => onNavigate('advisor')}
            className="flex-1 lg:flex-none px-5 py-3 bg-white/10 hover:bg-white/15 active:scale-95 text-white rounded-xl font-semibold text-xs transition-all border border-white/15 cursor-pointer flex items-center justify-center gap-2"
          >
            <Cpu className="w-4 h-4" /> AI Diagnostics
          </button>
        </div>
      </div>

      {/* Profile settings slide out / edit wrapper */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-gray-50 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              {userProfile.name[0]?.toUpperCase()}
            </div>
            <div>
              <h3 className="font-sans font-semibold text-sm text-gray-900">Crop Profile & Objective Configuration</h3>
              <p className="text-4xs uppercase tracking-widest text-gray-400 font-extrabold">Tailors Gemini prompts & intelligence layers</p>
            </div>
          </div>
          <button
            id="btn-profile-edit-toggle"
            onClick={() => {
              if (isEditingProfile) handleSaveProfile();
              else {
                setEditedProfile({ ...userProfile });
                setIsEditingProfile(true);
              }
            }}
            className="text-xs font-bold px-3 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {isEditingProfile ? (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-600" /> Save Settings
              </>
            ) : (
              <>
                <Settings2 className="w-3.5 h-3.5" /> Configure Profile
              </>
            )}
          </button>
        </div>

        {isEditingProfile ? (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            <div className="md:col-span-1">
              <label className="block text-4xs uppercase font-extrabold text-gray-400 mb-1">Grower Name</label>
              <input
                type="text"
                className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                value={editedProfile.name}
                onChange={e => setEditedProfile({ ...editedProfile, name: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-4xs uppercase font-extrabold text-gray-400 mb-1">Primary City</label>
              <input
                type="text"
                className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-hidden focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-gray-50/50"
                value={editedProfile.location}
                onChange={e => setEditedProfile({ ...editedProfile, location: e.target.value })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-4xs uppercase font-extrabold text-gray-400 mb-1">Garden Size (sq ft)</label>
              <input
                type="number"
                className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-hidden focus:border-emerald-500 bg-gray-50/50"
                value={editedProfile.gardenSize}
                onChange={e => setEditedProfile({ ...editedProfile, gardenSize: Number(e.target.value) })}
              />
            </div>
            <div className="md:col-span-1">
              <label className="block text-4xs uppercase font-extrabold text-gray-400 mb-1">Experience Level</label>
              <select
                className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:border-emerald-500"
                value={editedProfile.experience}
                onChange={e => setEditedProfile({ ...editedProfile, experience: e.target.value as any })}
              >
                {['Beginner', 'Intermediate', 'Expert', 'Commercial'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="block text-4xs uppercase font-extrabold text-gray-400 mb-1">Agriculture Focus</label>
              <select
                className="w-full text-xs px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50/50 focus:outline-hidden focus:border-emerald-500"
                value={editedProfile.primaryGoal}
                onChange={e => setEditedProfile({ ...editedProfile, primaryGoal: e.target.value })}
              >
                {[
                  'Maximize Crop Yield',
                  'Pest Resistance & Organic Companion Planting',
                  'Community Produce Sharing & Networking',
                  'Carbon Footprint Reduction & Micro-Climate Control'
                ].map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <span className="block text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">Location Zone</span>
              <span className="text-xs font-semibold text-gray-800 block truncate">{userProfile.location}</span>
            </div>
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <span className="block text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">Est. Yield Area</span>
              <span className="text-xs font-semibold text-gray-800 block">{userProfile.gardenSize} sq ft ({estimatedYieldPerYear.toFixed(0)}kg/yr)</span>
            </div>
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <span className="block text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">Skill Profile</span>
              <span className="text-xs font-semibold text-emerald-700 block">{userProfile.experience}</span>
            </div>
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100">
              <span className="block text-[10px] font-bold text-gray-400 mb-0.5 uppercase tracking-wide">Primary Target</span>
              <span className="text-xs font-semibold text-gray-800 block truncate">{userProfile.primaryGoal}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. Top Grid: Resilience Score & Weather Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* RESILIENCE SCORE (Lg: 7) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.25 }}
          className="lg:col-span-7 bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-md border border-gray-100 flex flex-col justify-between space-y-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-4 border-b border-gray-50">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                <h3 id="resilience-score-title" className="font-sans font-bold text-gray-900 text-lg">Climate Resilience Ecosystem</h3>
              </div>
              <p className="text-xs text-gray-400">Adaptive rating of biological diversity, hydration efficiency, and frost safeguard readiness</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-lg">High Resilience</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* SVG Circular Gauge */}
            <div className="md:col-span-4 flex flex-col items-center justify-center relative py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-gray-100"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="40"
                    className="stroke-emerald-500"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray="251.2"
                    initial={{ strokeDashoffset: 251.2 }}
                    animate={{ strokeDashoffset: 251.2 - (251.2 * averageResilienceScore) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-black text-gray-900 font-mono">{averageResilienceScore}%</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Resilient</span>
                </div>
              </div>
            </div>

            {/* Breakdown Bars & Interactive Clicks */}
            <div className="md:col-span-8 space-y-4">
              <div 
                onClick={() => setActiveResilienceTab('overall')}
                className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${activeResilienceTab === 'overall' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'}`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Overall Health</span>
                    <span className="font-mono text-emerald-700">{averageResilienceScore}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${averageResilienceScore}%` }} />
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setActiveResilienceTab('biodiversity')}
                className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${activeResilienceTab === 'biodiversity' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'}`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Crop Biodiversity</span>
                    <span className="font-mono text-emerald-700">{biodiversityScore}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-teal-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${biodiversityScore}%` }} />
                  </div>
                </div>
              </div>

              <div 
                onClick={() => setActiveResilienceTab('water')}
                className={`p-3 rounded-xl border transition cursor-pointer flex justify-between items-center ${activeResilienceTab === 'water' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'}`}
              >
                <div className="space-y-1 flex-1">
                  <div className="flex justify-between text-xs font-bold text-gray-700">
                    <span>Soil Hydration Precision</span>
                    <span className="font-mono text-emerald-700">{waterEfficiencyScore}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000" style={{ width: `${waterEfficiencyScore}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Expanded Recharts Trend Chart */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-700">Historical Ecosystem Resilience</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Jan - Jun (Live Trend)</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={resilienceTrendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorResilience" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} domain={[50, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }} 
                    labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#374151' }}
                    itemStyle={{ fontSize: '11px', padding: '2px 0' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={activeResilienceTab === 'overall' ? 'resilience' : activeResilienceTab === 'biodiversity' ? 'biodiversity' : 'water'} 
                    stroke="#10b981" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorResilience)" 
                    name={activeResilienceTab === 'overall' ? 'Ecosystem score' : activeResilienceTab === 'biodiversity' ? 'Biodiversity index' : 'Water score'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>

        {/* LIVE NEIGHBORHOOD WEATHER (Lg: 5) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ y: -3 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          style={{ backgroundImage: weatherTheme.bgStyle }} 
          className={`lg:col-span-5 rounded-3xl p-6 shadow-sm hover:shadow-md border transition-all duration-300 flex flex-col justify-between space-y-6 ${weatherTheme.gradient} ${weatherTheme.border}`}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-1.5">
                <CloudSun className="w-4 h-4 text-emerald-600" />
                <h3 id="weather-title" className="font-sans font-bold text-xs tracking-wider uppercase text-gray-800">Ecosystem Climate Card</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-white text-emerald-800 font-bold rounded-md border border-emerald-200/50 shadow-xs">Zone Radar</span>
            </div>

            {/* Geocoding Location Lookup Search */}
            <div className="relative mb-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search another city or county..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-white/80 border border-gray-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-emerald-500 shadow-3xs"
                  />
                  {searching && (
                    <RefreshCw className="absolute right-3 top-2.5 h-3.5 w-3.5 text-gray-400 animate-spin" />
                  )}
                </div>
                <button
                  onClick={handleAutoDetect}
                  disabled={detecting}
                  className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition cursor-pointer flex items-center justify-center shrink-0 shadow-3xs"
                  title="Detect location via browser geolocation"
                >
                  <Navigation className={`h-4 w-4 text-emerald-600 ${detecting ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Suggestions autocomplete panel */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-gray-150 rounded-xl shadow-lg z-30 max-h-48 overflow-y-auto divide-y divide-gray-50">
                  {suggestions.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        const nickname = `${item.name}, ${item.admin1 || item.country}`;
                        const loc = {
                          name: nickname,
                          city: item.name,
                          county: item.admin1 || item.country,
                          country: item.country,
                          lat: item.latitude,
                          lon: item.longitude
                        };
                        setCurrentLocation(loc);
                        setSearchQuery('');
                        setSuggestions([]);
                      }}
                      className="w-full text-left px-4 py-2.5 text-xs hover:bg-emerald-50 transition flex flex-col cursor-pointer"
                    >
                      <span className="font-bold text-gray-800">{item.name}</span>
                      <span className="text-[10px] text-gray-400">
                        {item.admin1 ? `${item.admin1}, ` : ''}{item.country} (Lat: {item.latitude.toFixed(2)}, Lon: {item.longitude.toFixed(2)})
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Saved Locations List */}
            <div className="mb-4 space-y-1">
              <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">My Saved microclimates</span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {savedLocations.map((loc) => {
                  const isActive = currentLocation.name === loc.name;
                  return (
                    <div
                      key={loc.name}
                      onClick={() => setCurrentLocation(loc)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                        isActive 
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs' 
                          : 'bg-white/90 hover:bg-white text-gray-600 border-gray-200'
                      }`}
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="max-w-[120px] truncate">{loc.name}</span>
                      {savedLocations.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteSavedLocation(loc.name, e)}
                          className={`p-0.5 rounded-md hover:bg-red-50 hover:text-red-600 transition cursor-pointer ${
                            isActive ? 'text-emerald-200 hover:bg-emerald-700 hover:text-white' : 'text-gray-400'
                          }`}
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Main Weather Display */}
            {weather ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4 bg-white/60 p-4 rounded-2xl border border-white/40">
                  <div className="p-3 bg-white rounded-xl border border-gray-100 shadow-2xs flex items-center justify-center shrink-0 text-3xl">
                    {weatherTheme.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-3xl font-black text-gray-900 leading-none block">{weather.temp}°C</span>
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block mt-0.5">
                      {weather.condition} in {currentLocation.city}
                    </span>
                    <span className="text-[10px] text-gray-500 block truncate">
                      {currentLocation.county}, {currentLocation.country}
                    </span>
                  </div>

                  {/* Nickname save action */}
                  {!savedLocations.some(l => l.name.toLowerCase() === currentLocation.name.toLowerCase()) && (
                    <div className="shrink-0">
                      {!showSaveNicknameModal ? (
                        <button
                          onClick={() => {
                            setNewLocationNickname(currentLocation.city);
                            setShowSaveNicknameModal(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <Plus className="h-3 w-3" /> Save
                        </button>
                      ) : (
                        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                          <input
                            type="text"
                            placeholder="Nickname..."
                            value={newLocationNickname}
                            onChange={(e) => setNewLocationNickname(e.target.value)}
                            className="text-[10px] px-1.5 py-1 border border-gray-200 rounded-md max-w-[80px]"
                          />
                          <button
                            onClick={handleSaveCurrentLocation}
                            className="p-1 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 cursor-pointer"
                          >
                            <Check className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub weather details */}
                <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-semibold text-gray-600">
                  <div className="bg-white/40 p-2.5 rounded-xl border border-white/20">
                    <span className="text-gray-400 block mb-0.5">Humidity</span>
                    <span className="text-gray-800 text-xs font-bold">{weather.humidity}%</span>
                  </div>
                  <div className="bg-white/40 p-2.5 rounded-xl border border-white/20">
                    <span className="text-gray-400 block mb-0.5">Wind Velocity</span>
                    <span className="text-gray-800 text-xs font-bold">{weather.wind} km/h</span>
                  </div>
                </div>

                {/* Horizontal Scroll 7-Day Forecast */}
                <div className="space-y-1.5">
                  <span className="block text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Weekly climatology window</span>
                  <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                    {weather.forecast.map((f, i) => {
                      const fTheme = getWeatherTheme(f.condition);
                      return (
                        <div key={i} className="min-w-[72px] p-2 rounded-xl bg-white/60 hover:bg-white border border-white/40 hover:border-emerald-200 text-center transition flex-1">
                          <span className="text-[10px] font-bold text-gray-400 block uppercase">{f.day}</span>
                          <span className="text-xs font-bold block text-gray-800 mt-1">{f.temp}°</span>
                          <span className="text-lg block mt-0.5">{fTheme.icon}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-xs font-semibold animate-pulse">Syncing live climate radars...</div>
            )}
          </div>

          {/* AI Advisor Climate Alert banner */}
          {weather?.alerts && weather.alerts.length > 0 && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white/90 border border-red-200/50 p-3.5 rounded-2xl flex gap-2.5 items-start shadow-xs"
            >
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-red-900 flex items-center gap-1">
                  Micro-Climate Threat <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block animate-ping" />
                </h4>
                <p className="text-[10px] text-red-800 mt-1 leading-relaxed">{weather.alerts[0].advice}</p>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* 3. Virtual IoT Sensors Section with Interactive Historical charts */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="bg-white/80 backdrop-blur-md rounded-3xl p-6 shadow-sm hover:shadow-md border border-gray-100 space-y-6"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-4 border-b border-gray-50">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              <h3 id="sensors-integration-title" className="font-sans font-bold text-gray-900 text-lg">Integrated Virtual IoT Telemetry</h3>
            </div>
            <p className="text-xs text-gray-400">Continuous telemetry arrays tracking soil moisture profiles and solar PAR coefficients</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-1 rounded-lg">Sync: {telemetry.timestamp}</span>
            <button
              id="btn-trigger-irrigation"
              onClick={handleToggleIrrigation}
              className={`text-xs font-bold px-4 py-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                isIrrigating 
                  ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-blue-50 hover:bg-blue-100 border-blue-150 text-blue-700'
              }`}
            >
              <Droplets className={`w-4 h-4 ${isIrrigating ? 'animate-bounce' : ''}`} />
              {isIrrigating ? 'Irrigation Online' : 'Hydrate Beds'}
            </button>
          </div>
        </div>

        {/* Dynamic 4 Grid metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Soil Moisture */}
          <div 
            onClick={() => setActiveSensorChart('moisture')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between relative overflow-hidden ${
              activeSensorChart === 'moisture' ? 'bg-emerald-50/10 border-emerald-500/40 shadow-xs' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Soil Moisture</span>
              <span className="text-3xl font-black font-mono text-gray-900 block">{telemetry.moisture}%</span>
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border ${getMoistureStatus(telemetry.moisture).color}`}>
                {getMoistureStatus(telemetry.moisture).text}
              </span>
            </div>
            <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-600">
              <Droplets className="w-5 h-5" />
            </div>
            {activeSensorChart === 'moisture' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
          </div>

          {/* Soil Temperature */}
          <div 
            onClick={() => setActiveSensorChart('temperature')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between relative overflow-hidden ${
              activeSensorChart === 'temperature' ? 'bg-emerald-50/10 border-emerald-500/40 shadow-xs' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Soil Temp</span>
              <span className="text-3xl font-black font-mono text-gray-900 block">{telemetry.temperature}°C</span>
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border ${getTempStatus(telemetry.temperature).color}`}>
                {getTempStatus(telemetry.temperature).text}
              </span>
            </div>
            <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-600">
              <Thermometer className="w-5 h-5" />
            </div>
            {activeSensorChart === 'temperature' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
          </div>

          {/* pH level */}
          <div 
            onClick={() => setActiveSensorChart('pH')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between relative overflow-hidden ${
              activeSensorChart === 'pH' ? 'bg-emerald-50/10 border-emerald-500/40 shadow-xs' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Soil pH</span>
              <span className="text-3xl font-black font-mono text-gray-900 block">{telemetry.pH}</span>
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border ${getPHStatus(telemetry.pH).color}`}>
                {getPHStatus(telemetry.pH).text}
              </span>
            </div>
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600">
              <Leaf className="w-5 h-5" />
            </div>
            {activeSensorChart === 'pH' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
          </div>

          {/* Sunlight */}
          <div 
            onClick={() => setActiveSensorChart('light')}
            className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between relative overflow-hidden ${
              activeSensorChart === 'light' ? 'bg-emerald-50/10 border-emerald-500/40 shadow-xs' : 'bg-gray-50/50 border-transparent hover:bg-gray-50'
            }`}
          >
            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">Solar PAR Light</span>
              <span className="text-3xl font-black font-mono text-gray-900 block">{telemetry.light}%</span>
              <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-2 border ${getLightStatus(telemetry.light).color}`}>
                {getLightStatus(telemetry.light).text}
              </span>
            </div>
            <div className="p-2.5 bg-yellow-500/10 rounded-xl text-yellow-600">
              <Sun className="w-5 h-5" />
            </div>
            {activeSensorChart === 'light' && <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />}
          </div>

        </div>

        {/* Expandable Recharts Sensor Chart & Sliders Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-linear-to-b from-gray-50/50 to-white p-5 rounded-2xl border border-gray-150">
          <div className="lg:col-span-8 space-y-2">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold text-gray-700 capitalize">24-Hour Telemetry Progression: {activeSensorChart}</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md uppercase">Reactive simulation</span>
            </div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sensorHistory} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSensor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                  <XAxis dataKey="time" stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f3f4f6' }} 
                    itemStyle={{ fontSize: '11px' }}
                    labelStyle={{ fontSize: '10px', color: '#9ca3af' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#2563eb" 
                    strokeWidth={2}
                    fillOpacity={1} 
                    fill="url(#colorSensor)" 
                    name={activeSensorChart || 'Metric'}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 flex flex-col justify-center space-y-4 border-t lg:border-t-0 lg:border-l border-gray-150/80 pt-4 lg:pt-0 lg:pl-6">
            <h4 className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-emerald-600" /> Interactive Sensor Overrides
            </h4>
            <p className="text-[10px] text-gray-500 leading-relaxed">
              Manually shift moisture & temperature curves to verify how the GrowLocal automated alert systems process critical water and frost safeguards.
            </p>

            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1">
                  <span>Soil Moisture Override</span>
                  <span className="font-mono text-emerald-700">{telemetry.moisture}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  value={telemetry.moisture}
                  onChange={(e) => handleSensorOverride('moisture', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-[10px] font-bold text-gray-600 mb-1">
                  <span>Soil Temp Override</span>
                  <span className="font-mono text-emerald-700">{telemetry.temperature}°C</span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="45"
                  step="0.5"
                  value={telemetry.temperature}
                  onChange={(e) => handleSensorOverride('temperature', Number(e.target.value))}
                  className="w-full accent-emerald-600"
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Bottom Grid: AI Briefing & Task Plan Checklist & Garden Planner Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* AI DAILY BRIEFING CARD */}
        <div className="lg:col-span-5 bg-linear-to-b from-slate-900 to-emerald-950 text-white rounded-3xl p-6 shadow-xl border border-emerald-800/20 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-emerald-800/40">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-emerald-400" />
                <h3 className="font-sans font-bold text-gray-100 text-base">Gemini Daily Briefing</h3>
              </div>
              <span className="text-[10px] px-2.5 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg font-bold flex items-center gap-1.5">
                <RefreshCw className={`w-3 h-3 ${loadingBriefing ? 'animate-spin' : ''}`} /> Syncing
              </span>
            </div>

            {loadingBriefing ? (
              <div className="space-y-3 py-6">
                <div className="h-4 bg-emerald-800/30 rounded-md w-3/4 animate-pulse" />
                <div className="h-4 bg-emerald-800/30 rounded-md animate-pulse" />
                <div className="h-4 bg-emerald-800/30 rounded-md w-5/6 animate-pulse" />
              </div>
            ) : briefing ? (
              <div className="space-y-4">
                <p className="text-xs text-emerald-100/90 leading-relaxed font-sans font-medium">
                  {briefing.summary}
                </p>

                <div className="space-y-2">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-400">Microclimatic Quick Actions</span>
                  <div className="flex flex-col gap-2">
                    {briefing.quickActions.map((action, idx) => (
                      <div 
                        key={idx} 
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-[10px] font-medium leading-normal flex items-start gap-2 transition"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        <span>{action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-emerald-300">Briefing currently uncalibrated. Tap refresh or override sliders above to trigger briefing updates.</div>
            )}
          </div>

          <div className="pt-4 border-t border-emerald-800/40 flex items-center justify-between text-[10px] text-emerald-200">
            <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Real-time forecast model</span>
            <button 
              onClick={fetchDailyBriefing}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-emerald-300 font-bold transition cursor-pointer"
            >
              Force Sync
            </button>
          </div>
        </div>

        {/* HORTICULTURAL ACTION PLAN (Lg: 7) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-50">
            <div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Horticultural Action Plan</span>
              </div>
              <h3 id="calendar-tasks-title" className="text-lg font-sans font-bold text-gray-900 mt-0.5">Smart Calendar & Weekly Tasks</h3>
              <p className="text-xs text-gray-500 mt-0.5">AI-driven schedules calibrated to local variables and coordinates</p>
            </div>
            <button
              onClick={handleGenerateTasks}
              disabled={generatingTasks}
              className="self-start sm:self-center px-4.5 py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {generatingTasks ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              <span>{generatingTasks ? 'Calibrating...' : 'AI Automate Plan'}</span>
            </button>
          </div>

          {/* Task Completion Progress */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-emerald-50/30 rounded-xl border border-emerald-100 text-xs">
            <div className="space-y-1">
              <span className="font-bold text-emerald-950 block">Weekly Completion Rate</span>
              <span className="text-gray-600 text-[11px]">
                {tasks.filter(t => t.completed).length} of {tasks.length} strategic tasks completed this week.
              </span>
            </div>
            <div className="w-full sm:w-48 bg-emerald-200/40 rounded-full h-2 overflow-hidden border border-emerald-200/20">
              <div 
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${tasks.length > 0 ? (tasks.filter(t => t.completed).length / tasks.length) * 100 : 0}%` }}
              />
            </div>
          </div>

          {generationError && (
            <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{generationError}</span>
            </div>
          )}

          {/* Core Checklist Alarm system */}
          <div className="space-y-3.5">
            {telemetry.moisture < 35 && (
              <motion.div 
                animate={{ scale: [1, 1.01, 1] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className="flex items-center gap-3.5 p-3.5 bg-red-50 border border-red-100 rounded-2xl text-red-800 text-xs"
              >
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-red-950">CRITICAL WATER DRAWDOWN</span>
                  <span>Sensor reports severe moisture drought ({telemetry.moisture}%). Initiate watering protocols immediately to avoid root chlorosis.</span>
                </div>
                <button 
                  onClick={handleToggleIrrigation}
                  className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-4xs uppercase tracking-wide transition cursor-pointer shrink-0 shadow-sm"
                >
                  Water Now
                </button>
              </motion.div>
            )}

            {telemetry.temperature < 10 && (
              <div className="flex items-center gap-3.5 p-3.5 bg-sky-50 border border-sky-100 rounded-2xl text-sky-800 text-xs">
                <ShieldAlert className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block text-sky-950">FROST OVERRIDE THREAT</span>
                  <span>Active canopy temperatures dropped below 10°C. Protect tomato or pepper seedlings with horticulture blankets.</span>
                </div>
              </div>
            )}

            {/* List of Tasks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tasks.map(task => (
                <div 
                  key={task.id}
                  onClick={() => handleToggleTask(task.id)}
                  className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between text-xs gap-3 ${
                    task.completed 
                      ? 'bg-emerald-50/10 border-emerald-100 opacity-60' 
                      : 'bg-white hover:bg-gray-50/50 border-gray-150 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-emerald-800 font-mono text-[9px] uppercase bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded">
                        {task.day}
                      </span>
                      <span className="font-semibold text-gray-400 text-[9px] uppercase tracking-wider truncate max-w-[80px]">
                        {task.category}
                      </span>
                    </div>

                    <h4 className={`font-bold text-xs text-gray-900 leading-tight ${task.completed ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                    </h4>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-gray-100/40 flex items-center justify-between text-[10px]">
                    <span className={`font-bold uppercase tracking-wider text-[9px] ${task.completed ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {task.completed ? 'Completed' : 'Pending'}
                    </span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                      task.completed 
                        ? 'bg-emerald-600 border-emerald-600 text-white' 
                        : 'border-gray-250 bg-white'
                    }`}>
                      {task.completed && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Micro Navigators */}
            <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] text-gray-400 font-semibold">
              <span>GrowLocal Strategic Shortcuts:</span>
              <div className="flex flex-wrap gap-4 font-bold text-emerald-700">
                <button onClick={() => onNavigate('planner')} className="hover:underline flex items-center gap-0.5 cursor-pointer">
                  Urban Planner <ArrowRight className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => onNavigate('marketplace')} className="hover:underline flex items-center gap-0.5 cursor-pointer">
                  Seed Exchange <ArrowRight className="w-2.5 h-2.5" />
                </button>
                <button onClick={() => onNavigate('advisor')} className="hover:underline flex items-center gap-0.5 cursor-pointer">
                  Diagnostic Log <ArrowRight className="w-2.5 h-2.5" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
