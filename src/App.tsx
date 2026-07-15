import React, { useState, useEffect } from 'react';
import { 
  Sprout, LayoutDashboard, Grid, Bot, ShoppingBag, 
  Users, Globe, Leaf, Menu, X, Check, Bell, RefreshCw, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Crop, GardenPlot, WeatherData, MarketplaceItem, CommunityPost, UserProfile } from './types';
import DashboardView from './components/DashboardView';
import PlannerView from './components/PlannerView';
import AdvisorView from './components/AdvisorView';
import MarketplaceView from './components/MarketplaceView';
import CommunityFeedView from './components/CommunityFeedView';
import ResilienceView from './components/ResilienceView';

export default function App() {
  // Navigation State
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Global Context State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Elena Rostova',
    experience: 'Intermediate',
    gardenSize: 45,
    location: 'San Francisco',
    primaryGoal: 'Pest Resistance & Organic Companion Planting'
  });

  // Location Management State
  const [currentLocation, setCurrentLocation] = useState<{
    name: string;
    city: string;
    county: string;
    country: string;
    lat: number;
    lon: number;
  }>(() => {
    const saved = localStorage.getItem('growlocal_current_location');
    return saved ? JSON.parse(saved) : {
      name: 'San Francisco Rooftop',
      city: 'San Francisco',
      county: 'San Francisco County',
      country: 'United States',
      lat: 37.7749,
      lon: -122.4194
    };
  });

  const [savedLocations, setSavedLocations] = useState<Array<{
    name: string;
    city: string;
    county: string;
    country: string;
    lat: number;
    lon: number;
  }>>(() => {
    const saved = localStorage.getItem('growlocal_saved_locations');
    return saved ? JSON.parse(saved) : [
      { name: 'San Francisco Rooftop', city: 'San Francisco', county: 'San Francisco County', country: 'United States', lat: 37.7749, lon: -122.4194 },
      { name: 'Brooklyn Backyard', city: 'Brooklyn', county: 'Kings County', country: 'United States', lat: 40.6782, lon: -73.9442 },
      { name: 'London Balcony', city: 'London', county: 'Greater London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278 }
    ];
  });

  // Keep localStorage up-to-date
  useEffect(() => {
    localStorage.setItem('growlocal_current_location', JSON.stringify(currentLocation));
    setUserProfile(prev => ({ ...prev, location: currentLocation.city }));
  }, [currentLocation]);

  useEffect(() => {
    localStorage.setItem('growlocal_saved_locations', JSON.stringify(savedLocations));
  }, [savedLocations]);

  // AI credits state
  const [aiCredits, setAiCredits] = useState<{ remaining: number; total: number; used: number }>({
    remaining: 15,
    total: 15,
    used: 0
  });

  // Database States
  const [crops, setCrops] = useState<Crop[]>([]);
  const [savedGardens, setSavedGardens] = useState<GardenPlot[]>([]);
  const [activeGarden, setActiveGarden] = useState<GardenPlot | null>(null);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>([]);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  // State loader flags
  const [loading, setLoading] = useState(true);

  // Fetch live weather from open-meteo proxy
  const fetchLiveWeather = async (loc: typeof currentLocation) => {
    try {
      const query = new URLSearchParams({
        lat: loc.lat.toString(),
        lon: loc.lon.toString(),
        city: loc.city,
        county: loc.county
      });
      const res = await fetch(`/api/weather?${query}`);
      if (res.ok) {
        setWeather(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch live weather:', err);
    }
  };

  useEffect(() => {
    if (!loading) {
      fetchLiveWeather(currentLocation);
    }
  }, [currentLocation]);

  // Fetch AI credits
  const fetchAiCredits = async () => {
    try {
      const res = await fetch('/api/ai-credits');
      if (res.ok) {
        setAiCredits(await res.json());
      }
    } catch (err) {
      console.error('Failed to sync AI usage credentials:', err);
    }
  };

  // Fetch all basic data on startup
  const fetchAllData = async () => {
    try {
      const [cropsRes, gardensRes, marketRes, commRes] = await Promise.all([
        fetch('/api/crops'),
        fetch('/api/gardens'),
        fetch('/api/marketplace'),
        fetch('/api/community')
      ]);

      if (cropsRes.ok) setCrops(await cropsRes.json());
      if (gardensRes.ok) {
        const gardensData = await gardensRes.json();
        setSavedGardens(gardensData);
        if (gardensData.length > 0 && !activeGarden) {
          setActiveGarden(gardensData[0]);
        }
      }
      if (marketRes.ok) setMarketplaceItems(await marketRes.json());
      if (commRes.ok) setCommunityPosts(await commRes.json());
      
      // Load current weather based on saved location
      await fetchLiveWeather(currentLocation);

    } catch (err) {
      console.error('Failed to load full-stack data parameters:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    fetchAiCredits();
  }, []);

  // Handlers for Data Mutation (Secure backend persistence)
  const handleSaveGarden = async (garden: GardenPlot) => {
    try {
      const res = await fetch('/api/gardens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(garden)
      });
      if (res.ok) {
        const saved = await res.json();
        setActiveGarden(saved);
        // Refresh gardens list
        const listRes = await fetch('/api/gardens');
        if (listRes.ok) setSavedGardens(await listRes.json());
      }
    } catch (err) {
      console.error('Save garden layout failed:', err);
    }
  };

  const handleAddMarketplaceItem = async (item: Omit<MarketplaceItem, 'id' | 'dateAdded'>) => {
    try {
      const res = await fetch('/api/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (res.ok) {
        // Refresh marketplace
        const listRes = await fetch('/api/marketplace');
        if (listRes.ok) setMarketplaceItems(await listRes.json());
      }
    } catch (err) {
      console.error('Listing publication failed:', err);
    }
  };

  const handleAddCommunityPost = async (post: Omit<CommunityPost, 'id' | 'likes' | 'likedByUser' | 'comments' | 'date'>) => {
    try {
      const res = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(post)
      });
      if (res.ok) {
        // Refresh community
        const listRes = await fetch('/api/community');
        if (listRes.ok) setCommunityPosts(await listRes.json());
      }
    } catch (err) {
      console.error('Progress publication failed:', err);
    }
  };

  const handleLikePost = async (postId: string) => {
    try {
      const res = await fetch(`/api/community/${postId}/like`, { method: 'POST' });
      if (res.ok) {
        // Optimistic refresh
        const listRes = await fetch('/api/community');
        if (listRes.ok) setCommunityPosts(await listRes.json());
      }
    } catch (err) {
      console.error('Liking progress failed:', err);
    }
  };

  const handleAddComment = async (postId: string, author: string, content: string) => {
    try {
      const res = await fetch(`/api/community/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content })
      });
      if (res.ok) {
        // Refresh community
        const listRes = await fetch('/api/community');
        if (listRes.ok) setCommunityPosts(await listRes.json());
      }
    } catch (err) {
      console.error('Comment publication failed:', err);
    }
  };

  // Nav Items definition
  const NAV_ITEMS = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'planner', name: 'Garden Planner', icon: Grid },
    { id: 'advisor', name: 'AI Advisor', icon: Bot },
    { id: 'marketplace', name: 'Marketplace', icon: ShoppingBag },
    { id: 'community', name: 'Community', icon: Users },
    { id: 'resilience', name: 'Resilience', icon: Globe }
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-50 to-emerald-50/10 text-gray-800 flex flex-col md:flex-row antialiased">
      
      {/* Sidebar Navigation - Desktop Mode */}
      <aside className="hidden md:flex md:w-64 bg-emerald-950 text-emerald-100 flex-col shrink-0 border-r border-emerald-900 shadow-xl relative z-10">
        
        {/* Branding header */}
        <div className="p-6 border-b border-emerald-900/50 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Sprout className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="font-sans font-extrabold text-base text-white tracking-tight">GrowLocal AI</h1>
            <span className="text-4xs text-emerald-400 uppercase tracking-wider font-semibold">Urban Food Autonomy</span>
          </div>
        </div>

        {/* Links list */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40' 
                    : 'text-emerald-300/80 hover:bg-emerald-900/35 hover:text-white'
                }`}
              >
                <Icon className={`w-4.5 h-4.5 ${isActive ? 'scale-110' : ''}`} />
                <span>{item.name}</span>
                {item.id === 'resilience' && (
                  <span className="ml-auto w-1.5 h-1.5 bg-rose-500 rounded-full" title="Resilience alerts live" />
                )}
              </button>
            );
          })}
        </nav>

        {/* AI Credits Budget Tracking Widget */}
        <div className="mx-4 my-2 p-3.5 bg-emerald-900/35 rounded-xl border border-emerald-800/30 text-xs shrink-0">
          <div className="flex items-center justify-between mb-1.5 font-bold text-white">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Credits
            </span>
            <span className="text-emerald-400 font-mono text-xs">{aiCredits.remaining} / {aiCredits.total}</span>
          </div>
          <div className="w-full bg-emerald-950 rounded-full h-1.5 overflow-hidden border border-emerald-900/20">
            <div 
              className="bg-gradient-to-r from-amber-400 to-emerald-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${(aiCredits.remaining / aiCredits.total) * 100}%` }}
            />
          </div>
          <span className="block text-4xs text-emerald-300/50 mt-1.5">Free allocation refilled daily</span>
        </div>

        {/* Workspace Footer Profile display */}
        <div className="p-4 border-t border-emerald-900/50 bg-emerald-950/40 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold">
              {userProfile.name[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="block font-bold text-white truncate">{userProfile.name}</span>
              <span className="block text-4xs text-emerald-400 font-semibold truncate">{userProfile.location} · {userProfile.experience}</span>
            </div>
          </div>
        </div>

      </aside>

      {/* Header - Mobile Mode */}
      <header className="md:hidden bg-emerald-950 text-white px-5 py-4 flex items-center justify-between border-b border-emerald-900 z-20">
        <div className="flex items-center gap-2.5">
          <Sprout className="w-5 h-5 text-emerald-400" />
          <span className="font-sans font-extrabold text-sm tracking-tight">GrowLocal AI</span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 text-emerald-200 hover:text-white"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Slide-In Nav Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-[57px] bg-emerald-950 text-white z-10 flex flex-col justify-between py-6">
          <nav className="px-6 space-y-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-sm font-bold ${
                    isActive ? 'bg-emerald-600 text-white' : 'text-emerald-300 hover:bg-emerald-900/50'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
          
          {/* Mobile AI Credits display */}
          <div className="px-6 py-3 bg-emerald-900/35 border-y border-emerald-900/50 text-xs shrink-0">
            <div className="flex items-center justify-between mb-1.5 text-emerald-200">
              <span className="flex items-center gap-1 font-bold text-white">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> AI Credits
              </span>
              <span className="font-mono text-emerald-400 font-bold">{aiCredits.remaining} / {aiCredits.total}</span>
            </div>
            <div className="w-full bg-emerald-950 rounded-full h-1 overflow-hidden border border-emerald-900/20">
              <div 
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-1 rounded-full"
                style={{ width: `${(aiCredits.remaining / aiCredits.total) * 100}%` }}
              />
            </div>
          </div>

          <div className="px-6 border-t border-emerald-900 pt-6 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-700 flex items-center justify-center font-bold">
              {userProfile.name[0]?.toUpperCase()}
            </div>
            <div>
              <span className="font-bold block">{userProfile.name}</span>
              <span className="text-xs text-emerald-400">{userProfile.location}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main App Workspace */}
      <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8 overflow-y-auto relative z-0">
        
        {loading ? (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
            <span className="text-xs font-semibold text-gray-500 animate-pulse">Synchronizing GrowLocal AI engine...</span>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {activeView === 'dashboard' && (
                  <DashboardView
                    userProfile={userProfile}
                    setUserProfile={setUserProfile}
                    weather={weather}
                    onNavigate={(view) => setActiveView(view)}
                    onRefreshCredits={fetchAiCredits}
                    aiCredits={aiCredits}
                    currentLocation={currentLocation}
                    setCurrentLocation={setCurrentLocation}
                    savedLocations={savedLocations}
                    setSavedLocations={setSavedLocations}
                    fetchLiveWeather={fetchLiveWeather}
                  />
                )}

                {activeView === 'planner' && (
                  <PlannerView
                    crops={crops}
                    onSaveGarden={handleSaveGarden}
                    savedGardens={savedGardens}
                    onSelectGarden={(g) => {
                      setActiveGarden(g);
                    }}
                    activeGarden={activeGarden}
                    setActiveGarden={setActiveGarden}
                  />
                )}

                {activeView === 'advisor' && (
                  <AdvisorView
                    userProfile={userProfile}
                    onRefreshCredits={fetchAiCredits}
                    aiCredits={aiCredits}
                  />
                )}

                {activeView === 'marketplace' && (
                  <MarketplaceView
                    items={marketplaceItems}
                    onAddListing={handleAddMarketplaceItem}
                    onRefreshListings={fetchAllData}
                  />
                )}

                {activeView === 'community' && (
                  <CommunityFeedView
                    posts={communityPosts}
                    onAddPost={handleAddCommunityPost}
                    onLikePost={handleLikePost}
                    onAddComment={handleAddComment}
                    userProfile={userProfile}
                    onRefreshCredits={fetchAiCredits}
                    aiCredits={aiCredits}
                  />
                )}

                {activeView === 'resilience' && (
                  <ResilienceView
                    userProfile={userProfile}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

      </main>

      {/* Mobile Bottom Navigation Bar with Glassmorphism */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200/50 shadow-[0_-4px_24px_rgba(0,0,0,0.04)] px-3 py-2 z-40 flex justify-around items-center">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveView(item.id);
                setMobileMenuOpen(false);
              }}
              className="flex flex-col items-center justify-center gap-1.5 flex-1 py-1 relative text-center group cursor-pointer"
            >
              {isActive && (
                <motion.span 
                  layoutId="activeTabIndicatorMobile" 
                  className="absolute top-0 w-8 h-0.5 bg-emerald-600 rounded-full" 
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <Icon className={`w-5 h-5 transition-all duration-200 ${
                isActive 
                  ? 'text-emerald-600 scale-110' 
                  : 'text-gray-400 group-hover:text-emerald-600 group-active:scale-95'
              }`} />
              <span className={`text-[9px] font-bold tracking-tight transition-colors duration-200 ${
                isActive ? 'text-emerald-700 font-extrabold' : 'text-gray-400 font-medium'
              }`}>
                {item.name === 'Garden Planner' ? 'Planner' : item.name === 'AI Advisor' ? 'Advisor' : item.name}
              </span>
            </button>
          );
        })}
      </div>

    </div>
  );
}
