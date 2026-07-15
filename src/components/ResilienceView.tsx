import React, { useState } from 'react';
import { 
  Globe, ShieldAlert, Sparkles, Scale, Info, CheckCircle, 
  Leaf, Trophy, ArrowRight, Award, Trash2, HelpCircle
} from 'lucide-react';
import { UserProfile } from '../types';

interface ResilienceViewProps {
  userProfile: UserProfile;
}

interface HarvestRecord {
  id: string;
  crop: string;
  weight: number; // in kg
  co2Saved: number; // in kg CO2
  date: string;
}

export default function ResilienceView({ userProfile }: ResilienceViewProps) {
  // Harvest logs state for interactive carbon calculator
  const [harvests, setHarvests] = useState<HarvestRecord[]>([
    { id: '1', crop: 'Tomato', weight: 4.5, co2Saved: +(4.5 * 1.6).toFixed(1), date: '2026-07-01' },
    { id: '2', crop: 'Basil', weight: 0.8, co2Saved: +(0.8 * 2.3).toFixed(1), date: '2026-07-04' },
    { id: '3', crop: 'Kale', weight: 2.0, co2Saved: +(2.0 * 1.4).toFixed(1), date: '2026-07-08' }
  ]);

  const [inputCrop, setInputCrop] = useState('Tomato');
  const [inputWeight, setInputWeight] = useState('');
  const [submittingHarvest, setSubmittingHarvest] = useState(false);

  // Subsidy Application
  const [subsidyApplied, setSubsidyApplied] = useState(false);
  const [subsidyName, setSubsidyName] = useState('');
  const [subsidyEmail, setSubsidyEmail] = useState('');
  const [subsidySize, setSubsidySize] = useState(userProfile.gardenSize.toString());

  // Crop list with CO2 saving values (kg CO2 saved per kg of crop due to packaging & transit avoidance)
  const CROP_CO2_METRICS: Record<string, { co2PerKg: number, waterSavedLitersPerKg: number }> = {
    'Tomato': { co2PerKg: 1.6, waterSavedLitersPerKg: 210 },
    'Basil': { co2PerKg: 2.3, waterSavedLitersPerKg: 150 },
    'Kale': { co2PerKg: 1.4, waterSavedLitersPerKg: 110 },
    'Carrot': { co2PerKg: 1.1, waterSavedLitersPerKg: 95 },
    'Lettuce': { co2PerKg: 1.8, waterSavedLitersPerKg: 240 },
    'Strawberry': { co2PerKg: 2.5, waterSavedLitersPerKg: 310 }
  };

  const handleAddHarvest = (e: React.FormEvent) => {
    e.preventDefault();
    const weightVal = Number(inputWeight);
    if (!weightVal || weightVal <= 0) return;

    const metric = CROP_CO2_METRICS[inputCrop] || { co2PerKg: 1.5, waterSavedLitersPerKg: 120 };
    const co2Saved = +(weightVal * metric.co2PerKg).toFixed(1);

    const newRecord: HarvestRecord = {
      id: 'harvest-' + Date.now(),
      crop: inputCrop,
      weight: weightVal,
      co2Saved,
      date: new Date().toISOString().split('T')[0]
    };

    setHarvests(prev => [newRecord, ...prev]);
    setInputWeight('');
  };

  const handleDeleteHarvest = (id: string) => {
    setHarvests(prev => prev.filter(h => h.id !== id));
  };

  const handleApplySubsidy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subsidyName || !subsidyEmail) return;
    setSubsidyApplied(true);
  };

  // Cumulative sums
  const totalHarvestWeight = harvests.reduce((acc, h) => acc + h.weight, 0);
  const totalCo2Saved = +harvests.reduce((acc, h) => acc + h.co2Saved, 0).toFixed(1);
  const totalWaterSaved = harvests.reduce((acc, h) => {
    const metric = CROP_CO2_METRICS[h.crop] || { waterSavedLitersPerKg: 120 };
    return acc + (h.weight * metric.waterSavedLitersPerKg);
  }, 0);

  // Dynamic Resilience Score calculation (Max 100)
  const cropsVarietyCount = new Set(harvests.map(h => h.crop)).size;
  const carbonPoints = Math.min(30, totalCo2Saved * 3); // up to 30 points
  const waterPoints = Math.min(30, (totalWaterSaved / 100)); // up to 30 points
  const biodiversityPoints = Math.min(30, cropsVarietyCount * 10); // up to 30 points
  const baselinePoints = 10; // baseline garden size starting index
  const resilienceScore = Math.min(100, Math.round(baselinePoints + carbonPoints + waterPoints + biodiversityPoints));

  // Circular gauge calculations
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (resilienceScore / 100) * circumference;

  // Badges Earned Based on total CO2 offset
  const BADGES = [
    { id: 'b1', name: 'Zero Food Mile Pioneer', desc: 'Offset over 5kg CO2 emissions', req: 5, icon: '🌿', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
    { id: 'b2', name: 'Aquatic Guardian', desc: 'Conserved over 1,000L irrigation water footprint', req: 10, icon: '💧', color: 'bg-blue-50 text-blue-800 border-blue-200' },
    { id: 'b3', name: 'Sovereign Grower Medal', desc: 'Harvested over 15kg of organic micro-crop', req: 15, icon: '👑', color: 'bg-amber-50 text-amber-800 border-amber-200' }
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Panel */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-2 text-emerald-700">
          <Globe className="w-5 h-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Climate Safeguards & Eco-Metrics</span>
        </div>
        <h2 id="resilience-header" className="text-2xl font-sans font-bold text-gray-900 mt-1">Climate Resilience & Carbon Tracker</h2>
        <p className="text-xs text-gray-500 mt-0.5">Track your garden carbon footprint offset, access severe weather safety sheets, and secure city funding.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Carbon Offset Calculator (Lg: 7) */}
        <div className="lg:col-span-7 bg-white p-5 md:p-6 rounded-2xl border border-gray-100 shadow-xs space-y-6">
          <div className="border-b border-gray-50 pb-4">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <Scale className="w-4.5 h-4.5 text-emerald-600" />
              <span>Co2 Avoidance & Resilience Scoreboard</span>
            </h3>
            <p className="text-3xs text-gray-400 mt-0.5">Input your home garden crop yields to compute averted transport emissions and dynamic sustainability index.</p>
          </div>

          {/* Core summary figures with Circular SVG Gauge and Progress bars */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            {/* SVG Circular Gauge */}
            <div className="sm:col-span-4 flex flex-col items-center justify-center text-center border-b sm:border-b-0 sm:border-r border-gray-100 pb-3 sm:pb-0 sm:pr-4">
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  {/* Background track */}
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-gray-200 fill-none"
                    strokeWidth="7"
                  />
                  {/* Active glowing ring */}
                  <circle
                    cx="48"
                    cy="48"
                    r={radius}
                    className="stroke-emerald-600 fill-none transition-all duration-500 ease-out"
                    strokeWidth="7"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center score text */}
                <div className="absolute flex flex-col items-center">
                  <span className="text-lg font-extrabold font-mono text-gray-800 leading-none">{resilienceScore}</span>
                  <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">Index</span>
                </div>
              </div>
              <span className="text-3xs font-extrabold text-emerald-800 uppercase tracking-wide mt-2 block">Resilience Rating</span>
            </div>

            {/* Adjacent progress bars */}
            <div className="sm:col-span-8 flex flex-col justify-center gap-2 text-xs">
              <div>
                <div className="flex justify-between items-center text-3xs font-bold text-gray-500 mb-0.5">
                  <span className="flex items-center gap-1">🌿 CO₂ Offset Progress</span>
                  <span className="text-emerald-700 font-mono">{totalCo2Saved} kg</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalCo2Saved / 10) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-3xs font-bold text-gray-500 mb-0.5">
                  <span className="flex items-center gap-1">💧 Irrigation foot conserved</span>
                  <span className="text-blue-700 font-mono">{totalWaterSaved.toFixed(0)} L</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (totalWaterSaved / 1500) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center text-3xs font-bold text-gray-500 mb-0.5">
                  <span className="flex items-center gap-1">🧬 Biodiversity variety count</span>
                  <span className="text-teal-700 font-mono">{cropsVarietyCount} species</span>
                </div>
                <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-teal-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(100, (cropsVarietyCount / 5) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Add Harvest Yield */}
          <form onSubmit={handleAddHarvest} className="flex flex-col sm:flex-row gap-3 items-end p-4 bg-gray-50 rounded-xl border border-gray-100 text-xs">
            <div className="flex-1 w-full">
              <label className="block text-4xs font-bold text-gray-500 uppercase mb-1">Crop Yield Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden"
                value={inputCrop}
                onChange={e => setInputCrop(e.target.value)}
              >
                {Object.keys(CROP_CO2_METRICS).map(name => <option key={name} value={name}>{name}</option>)}
              </select>
            </div>
            <div className="flex-1 w-full">
              <label className="block text-4xs font-bold text-gray-500 uppercase mb-1">Harvest weight (kg)</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="e.g., 2.4"
                className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden"
                value={inputWeight}
                onChange={e => setInputWeight(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs cursor-pointer text-xs"
            >
              Log Yield
            </button>
          </form>

          {/* Harvest logs list */}
          <div className="space-y-2.5 max-h-[190px] overflow-y-auto pr-1">
            {harvests.map(h => {
              const metric = CROP_CO2_METRICS[h.crop] || { waterSavedLitersPerKg: 120 };
              const savedWater = h.weight * metric.waterSavedLitersPerKg;

              return (
                <div key={h.id} className="flex items-center justify-between p-3 bg-white border border-gray-100 rounded-xl hover:bg-gray-50 transition text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                      {h.crop[0]}
                    </span>
                    <div>
                      <span className="font-bold text-gray-900 block">{h.crop} Harvest log</span>
                      <span className="text-4xs text-gray-400 font-medium block">Yield: {h.weight} kg · {h.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right text-3xs font-mono space-y-0.5">
                      <div className="text-teal-700 font-bold">-{h.co2Saved} kg CO₂</div>
                      <div className="text-blue-600 font-medium">{savedWater.toFixed(0)}L footprint</div>
                    </div>
                    <button
                      onClick={() => handleDeleteHarvest(h.id)}
                      className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                      title="Delete yield log"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

        </div>

        {/* Severe Climate Safeguards Playbook (Lg: 5) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-50 flex items-center gap-1.5">
            <ShieldAlert className="w-4.5 h-4.5 text-amber-600" />
            <span>Extreme weather Playbook</span>
          </h3>

          <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
            
            {/* Heatwave Card */}
            <div className="p-3.5 bg-amber-50/60 border border-amber-100 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-amber-950 flex items-center gap-1.5">
                🔥 Heat Dome & Severe Dryness Playbook
              </span>
              <p className="text-3xs text-amber-800 leading-relaxed font-sans">
                When soil temperature crosses 30°C (86°F), plant respiration goes critical, causing transpiration failure and leaf rot. 
              </p>
              <ul className="text-3xs text-amber-900 list-disc list-inside space-y-1 pl-1">
                <li>Apply dry straw mulch immediately to lettuce and brassicas.</li>
                <li>Water soil deeply before 7 AM; damp soils keep roots cooler by up to 10°F.</li>
                <li>Construct makeshift 40% shade cloths above tomato and pepper lines.</li>
              </ul>
            </div>

            {/* Frost warning card */}
            <div className="p-3.5 bg-sky-50/60 border border-sky-100 rounded-xl space-y-2 text-xs">
              <span className="font-bold text-sky-950 flex items-center gap-1.5">
                ❄️ Severe Frost & Cold Snap Playbook
              </span>
              <p className="text-3xs text-sky-800 leading-relaxed font-sans">
                Below 5°C (41°F), cell walls in tomato foliage and soft herbs can rupture, destroying entire rooftop container beds overnight.
              </p>
              <ul className="text-3xs text-sky-900 list-disc list-inside space-y-1 pl-1">
                <li>Drench the soil before sunset; wet soils retain 4x more solar heat than dry soils.</li>
                <li>Cover entire beds with insulating polypropylene spun sheets (floating row cover).</li>
                <li>Position compost containers near base lines; decaying carbon generates constant heat.</li>
              </ul>
            </div>

          </div>
        </div>

      </div>

      {/* Grid: Lower row (ecological badges and subsidy applications) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Ecological Badges (Md: 6) */}
        <div className="md:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-50 flex items-center gap-1.5">
            <Award className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
            <span>Ecological Milestones Earned</span>
          </h3>

          <div className="grid grid-cols-1 gap-3 text-xs">
            {BADGES.map(badge => {
              // check if user qualified (mock condition based on totals)
              let earned = false;
              if (badge.req === 5 && totalCo2Saved >= 5) earned = true;
              if (badge.req === 10 && totalWaterSaved >= 1000) earned = true;
              if (badge.req === 15 && totalHarvestWeight >= 15) earned = true;

              return (
                <div 
                  key={badge.id} 
                  className={`p-3 rounded-xl border flex gap-3 items-center ${
                    earned ? badge.color : 'bg-gray-50 border-gray-200 text-gray-400 opacity-60'
                  }`}
                >
                  <span className="text-2xl shrink-0">{badge.icon}</span>
                  <div>
                    <span className="font-bold block">{badge.name}</span>
                    <span className="text-3xs block leading-tight">{badge.desc}</span>
                  </div>
                  {earned ? (
                    <span className="ml-auto text-3xs font-bold text-emerald-700 bg-white border border-emerald-100 px-2 py-0.5 rounded-full shadow-4xs">Active</span>
                  ) : (
                    <span className="ml-auto text-3xs text-gray-400 font-semibold uppercase">Locked</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Municipal Subsidies Portal (Md: 6) */}
        <div className="md:col-span-6 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-50 flex items-center gap-1.5">
            <Award className="w-4.5 h-4.5 text-teal-600" />
            <span>City Rooftop Subsidies Application</span>
          </h3>
          <p className="text-3xs text-gray-500 leading-relaxed font-sans">
            Under SF City Ordinance 412, rooftop farming initiatives over 100 sq ft can request up to **$1,500** for high-efficiency drip systems and organic compost setup. Apply below to trigger a municipal check.
          </p>

          {subsidyApplied ? (
            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center text-emerald-800 text-xs space-y-2">
              <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
              <span className="font-bold block">Application Submitted!</span>
              <span>Our municipal moderator will schedule a geo-plot check of your garden profile. Check your inbox for details.</span>
            </div>
          ) : (
            <form onSubmit={handleApplySubsidy} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-4xs font-bold text-gray-500 uppercase mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Elena Rostova"
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:border-emerald-500"
                    value={subsidyName}
                    onChange={e => setSubsidyName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-4xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="elena@gmail.com"
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:border-emerald-500"
                    value={subsidyEmail}
                    onChange={e => setSubsidyEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-4xs font-bold text-gray-500 uppercase mb-1">Target Space (sq ft)</label>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden"
                    value={subsidySize}
                    onChange={e => setSubsidySize(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-lg shadow-xs transition text-xs cursor-pointer"
                  >
                    Submit Municipal Grant
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
