import React, { useState, useEffect } from 'react';
import { 
  MapPin, Plus, Heart, MessageSquare, Search, 
  Tag, Filter, ShoppingBag, Leaf, PhoneCall, Mail, 
  CheckCircle, ArrowRight, X, Navigation, RefreshCw
} from 'lucide-react';
import { MarketplaceItem } from '../types';
import { useMarketplace } from '../hooks/useMarketplace';


export default function MarketplaceView() {
  const { items, loading, addItem } = useMarketplace();

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');
  const [maxDistance, setMaxDistance] = useState<number>(5); // in miles
  
  // Listing Form
  const [isListingOpen, setIsListingOpen] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<'seeds' | 'produce' | 'tools' | 'compost' | 'other'>('produce');
  const [formPrice, setFormPrice] = useState<string>('Free');
  const [formQuantity, setFormQuantity] = useState('');
  const [formSellerName, setFormSellerName] = useState('');
  const [formSellerEmail, setFormSellerEmail] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formImage, setFormImage] = useState('');

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Selected item on map
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);

  // Filter listings
  const filteredItems = items.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase()) || 
                          item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'all' || item.category === category;
    
    // Compute mock distance (using coordinate scaling relative to middle SF coordinate 37.7749, -122.4194)
    const baseLat = 37.7749;
    const baseLng = -122.4194;
    const dx = (item.lat - baseLat) * 69; // 1 degree lat is approx 69 miles
    const dy = (item.lng - baseLng) * 55; // 1 degree lng is approx 55 miles
    const distance = Math.sqrt(dx * dx + dy * dy);

    return matchesSearch && matchesCategory && distance <= maxDistance;
  });

  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formSellerName || !formSellerEmail) return;

    setSaving(true);
    setSuccessMsg('');
    try {
      // Simulate lat/lng spread randomly around center
      const centerLat = 37.7749;
      const centerLng = -122.4194;
      const latSpread = (Math.random() - 0.5) * 0.03;
      const lngSpread = (Math.random() - 0.5) * 0.03;

      const randomImages: Record<string, string> = {
        seeds: 'https://images.unsplash.com/photo-1515586000433-45406d8e6662?auto=format&fit=crop&q=80&w=400',
        produce: 'https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=400',
        tools: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&q=80&w=400',
        compost: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400',
        other: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=400'
      };

      const finalPrice = (formPrice.toLowerCase() === 'free' ? 'Free' :
                         formPrice.toLowerCase() === 'trade' ? 'Trade' :
                         Number(formPrice)) as number | 'Free' | 'Trade';

      const payload = {
        title: formTitle,
        description: formDesc,
        category: formCategory,
        price: finalPrice,
        quantity: formQuantity || '1 unit',
        lat: centerLat + latSpread,
        lng: centerLng + lngSpread,
        address: formAddress || 'Mission District, SF',
        sellerName: formSellerName,
        sellerEmail: formSellerEmail,
        imageUrl: formImage || randomImages[formCategory],
        dateAdded: new Date().toISOString()
      };

      await addItem(payload);
      setSuccessMsg('Your surplus produce listing is live in the neighborhood exchange!');
      setTimeout(() => {
        setIsListingOpen(false);
        setSuccessMsg('');
        // Clear form
        setFormTitle('');
        setFormDesc('');
        setFormQuantity('');
        setFormSellerName('');
        setFormSellerEmail('');
        setFormAddress('');
        setFormImage('');
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // Render Category Badge
  const getCategoryColor = (cat: string) => {
    switch(cat) {
      case 'seeds': return 'text-amber-700 bg-amber-50 border-amber-200';
      case 'produce': return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case 'tools': return 'text-indigo-700 bg-indigo-50 border-indigo-200';
      case 'compost': return 'text-yellow-800 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700">
            <ShoppingBag className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Local Circular Economy</span>
          </div>
          <h2 id="marketplace-header" className="text-2xl font-sans font-bold text-gray-900 mt-1">Surplus Produce & Seed Exchange</h2>
          <p className="text-xs text-gray-500 mt-0.5">List backyard garden surplus, swap seeds, or buy tools locally from community micro-farmers.</p>
        </div>
        <button
          id="btn-open-list-surplus"
          onClick={() => setIsListingOpen(true)}
          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> List Your Surplus
        </button>
      </div>

      {/* Grid: Left Column is exchange listings & filters, Right Column is neighborhood interactive swap map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Listings and filter tray (Lg: 7) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search tomatoes, composting bins, dill seeds..."
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl focus:outline-hidden focus:border-emerald-500"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <select
                  className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-xl focus:outline-hidden text-gray-700"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="all">All Items</option>
                  <option value="produce">Surplus Produce</option>
                  <option value="seeds">Seed Varieties</option>
                  <option value="compost">Aged Compost</option>
                  <option value="tools">Gardening Tools</option>
                </select>

                <select
                  className="px-3 py-2 text-xs border border-gray-200 bg-white rounded-xl focus:outline-hidden text-gray-700"
                  value={maxDistance}
                  onChange={e => setMaxDistance(Number(e.target.value))}
                >
                  <option value="2">Within 2 miles</option>
                  <option value="5">Within 5 miles</option>
                  <option value="15">Within 15 miles</option>
                  <option value="50">Statewide</option>
                </select>
              </div>
            </div>
          </div>

          {/* List of items */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[580px] overflow-y-auto pr-1">
            {filteredItems.map(item => {
              // Calculate mock distance label
              const dx = (item.lat - 37.7749) * 69;
              const dy = (item.lng - -122.4194) * 55;
              const distance = Math.sqrt(dx * dx + dy * dy).toFixed(1);

              return (
                <div 
                  key={item.id} 
                  className={`bg-white rounded-xl overflow-hidden border transition duration-200 flex flex-col justify-between ${
                    selectedItem?.id === item.id 
                      ? 'border-emerald-600 ring-2 ring-emerald-50/70' 
                      : 'border-gray-100 hover:border-gray-200 hover:shadow-xs'
                  }`}
                >
                  <div>
                    {item.imageUrl && (
                      <div className="h-32 w-full relative">
                        <img 
                          src={item.imageUrl} 
                          alt={item.title} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2.5 right-2.5 px-2 py-1 rounded-md bg-emerald-950/80 text-white font-mono font-bold text-3xs backdrop-blur-3xs">
                          {typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : item.price}
                        </span>
                      </div>
                    )}
                    <div className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-4xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getCategoryColor(item.category)}`}>
                          {item.category}
                        </span>
                        <span className="text-4xs font-medium text-gray-400 flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" /> {distance} mi away
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 line-clamp-1">{item.title}</h4>
                      <p className="text-3xs text-gray-500 line-clamp-2 leading-relaxed">{item.description}</p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-0 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="text-left">
                      <span className="block text-4xs text-gray-400">Listed by</span>
                      <span className="text-3xs font-bold text-gray-700">{item.sellerName}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedItem(item);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-emerald-50 hover:border-emerald-200 text-gray-700 hover:text-emerald-950 rounded-lg text-4xs font-bold transition flex items-center gap-0.5 cursor-pointer"
                    >
                      Exchange details <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-2 py-12 text-center bg-white rounded-xl border border-gray-100">
                <Navigation className="w-8 h-8 text-gray-300 mx-auto mb-2 animate-bounce" />
                <span className="text-xs font-semibold text-gray-500 block">No surplus items listed in this range</span>
                <span className="text-3xs text-gray-400">Try expanding your search distance or searching for different keywords.</span>
              </div>
            )}
          </div>
        </div>

        {/* Local Exchange SVG Plot Map (Lg: 5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col justify-between h-full min-h-[460px]">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-gray-50 mb-3">
                <div className="flex items-center gap-1.5">
                  <Navigation className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                  <span className="text-xs font-bold text-gray-900">Neighborhood Swap Map</span>
                </div>
                <span className="text-4xs text-gray-400 font-semibold bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">Mission SF GeoPlot</span>
              </div>

              {/* Custom SVG Coordinate Grid Map */}
              <div className="relative aspect-square w-full max-w-[360px] mx-auto bg-slate-900 rounded-xl border border-slate-800 p-2 overflow-hidden shadow-inner">
                {/* Simulated streets / grid paths */}
                <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                  <line x1="20%" y1="0" x2="20%" y2="100%" stroke="white" strokeWidth="1" />
                  <line x1="50%" y1="0" x2="50%" y2="100%" stroke="white" strokeWidth="1.5" />
                  <line x1="80%" y1="0" x2="80%" y2="100%" stroke="white" strokeWidth="1" strokeDasharray="3" />
                  
                  <line x1="0" y1="30%" x2="100%" y2="30%" stroke="white" strokeWidth="1" />
                  <line x1="0" y1="65%" x2="100%" y2="65%" stroke="white" strokeWidth="1.5" />
                  <line x1="0" y1="85%" x2="100%" y2="85%" stroke="white" strokeWidth="1" strokeDasharray="4" />

                  {/* Concentric distance rings around user center */}
                  <circle cx="50%" cy="50%" r="20%" stroke="emerald" strokeWidth="1" strokeDasharray="2" fill="none" />
                  <circle cx="50%" cy="50%" r="40%" stroke="emerald" strokeWidth="0.5" strokeDasharray="4" fill="none" />
                </svg>

                {/* Glow concentric background for user center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-emerald-500 rounded-full animate-ping opacity-70 pointer-events-none" />
                
                {/* User Marker Dot */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-emerald-600 rounded-full border border-white flex items-center justify-center shadow-md cursor-pointer" title="Your garden">
                  <div className="w-1.5 h-1.5 bg-white rounded-full" />
                </div>

                {/* Plot each seller item relative to center coords (37.7749, -122.4194) */}
                {filteredItems.map(item => {
                  const baseLat = 37.7749;
                  const baseLng = -122.4194;
                  
                  // Scale coordinates to fit 10% to 90% space inside 100% box
                  const xPct = 50 + (item.lng - baseLng) * 2000;
                  const yPct = 50 - (item.lat - baseLat) * 2000; // lat increases going up, but CSS top goes down

                  const safeXPct = Math.min(90, Math.max(10, xPct));
                  const safeYPct = Math.min(90, Math.max(10, yPct));

                  const isSelected = selectedItem?.id === item.id;

                  let itemEmoji = '🌽';
                  if (item.category === 'seeds') itemEmoji = '🌱';
                  if (item.category === 'compost') itemEmoji = '🟤';
                  if (item.category === 'tools') itemEmoji = '🔧';

                  return (
                    <button
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      style={{ left: `${safeXPct}%`, top: `${safeYPct}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 cursor-pointer ${
                        isSelected 
                          ? 'bg-amber-500 border-2 border-white scale-125 z-30 animate-pulse' 
                          : 'bg-emerald-950 border border-emerald-400 hover:bg-emerald-800 hover:scale-115 z-20'
                      }`}
                      title={item.title}
                    >
                      <span className="text-3xs">{itemEmoji}</span>
                    </button>
                  );
                })}

                <span className="absolute bottom-2 left-2 text-4xs font-mono text-slate-400">Radius limits: 5 mi</span>
                <span className="absolute top-2 right-2 text-4xs font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" /> Synchronized
                </span>
              </div>
            </div>

            {/* Selected item popup details card */}
            {selectedItem ? (
              <div className="mt-4 p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl relative space-y-3">
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-2.5 right-2.5 p-1 text-gray-400 hover:text-gray-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex gap-3">
                  {selectedItem.imageUrl && (
                    <img 
                      src={selectedItem.imageUrl} 
                      alt={selectedItem.title} 
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded-lg border border-gray-100"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <span className="text-4xs font-bold text-emerald-800 uppercase block tracking-wider">{selectedItem.category}</span>
                    <h4 className="text-xs font-bold text-gray-900 truncate">{selectedItem.title}</h4>
                    <span className="text-3xs font-semibold text-gray-700 block mt-0.5">{selectedItem.quantity} · {typeof selectedItem.price === 'number' ? `$${selectedItem.price.toFixed(2)}` : selectedItem.price}</span>
                  </div>
                </div>
                <p className="text-3xs text-gray-500 leading-relaxed">{selectedItem.description}</p>
                
                {/* Contact row */}
                <div className="grid grid-cols-2 gap-2 text-3xs border-t border-emerald-100/50 pt-3">
                  <div className="flex items-center gap-1.5 text-gray-600 bg-white p-1.5 rounded-md border border-gray-100">
                    <Mail className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedItem.sellerEmail}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-600 bg-white p-1.5 rounded-md border border-gray-100">
                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span className="truncate">{selectedItem.address}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 p-4 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <span className="text-3xs text-gray-400">Click any glowing vendor marker on the geo-grid map to reveal exchange channels and contact information.</span>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Listing Creation Slide-In Form Modal */}
      {isListingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-3xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 space-y-4 shadow-2xl relative border border-gray-100">
            <button
              onClick={() => setIsListingOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="pb-3 border-b border-gray-50">
              <h3 className="text-base font-bold text-gray-900">List Your Urban Surplus produce</h3>
              <p className="text-xs text-gray-500">Enable local growers nearby to discover your seeds, composting, or harvest.</p>
            </div>

            {successMsg ? (
              <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                <span className="text-sm font-bold block">{successMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleCreateListing} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Surplus Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Organic Genovese Basil Sprigs"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Item Category</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as any)}
                    >
                      <option value="produce">Surplus Produce / Fruit / Veg</option>
                      <option value="seeds">Seed Packet / Variety</option>
                      <option value="compost">Compost / Soil Mulch</option>
                      <option value="tools">Gardening Tools</option>
                      <option value="other">Other / Support</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Surplus Description</label>
                  <textarea
                    rows={3}
                    placeholder="Provide description. Let neighbors know your growing practices (e.g. organic compost fed, harvested this morning, chemical spray free)."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Available Quantity</label>
                    <input
                      type="text"
                      placeholder="e.g., 2 lbs, 1 bag, 3 packets"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formQuantity}
                      onChange={e => setFormQuantity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Exchange Terms</label>
                    <input
                      type="text"
                      placeholder="e.g., Free, Trade, or $5.00"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formPrice}
                      onChange={e => setFormPrice(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Elena Rostova"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formSellerName}
                      onChange={e => setFormSellerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Contact Email</label>
                    <input
                      type="email"
                      required
                      placeholder="elena@gmail.com"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formSellerEmail}
                      onChange={e => setFormSellerEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Pickup Location / Area</label>
                    <input
                      type="text"
                      placeholder="e.g., Mission District, SF"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formAddress}
                      onChange={e => setFormAddress(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="Paste online photo URL"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={formImage}
                      onChange={e => setFormImage(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2 border-t border-gray-50">
                  <button
                    type="button"
                    onClick={() => setIsListingOpen(false)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                  >
                    {saving ? 'Saving...' : 'Deploy Listing'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
