import React, { useState, useEffect } from 'react';
import { 
  Sprout, Grid, Sparkles, Trash2, Save, 
  HelpCircle, AlertTriangle, CheckCircle, 
  RefreshCw, Info, Calendar, ArrowRight, LayoutGrid, Plus
} from 'lucide-react';
import { Crop, GardenPlot } from '../types';

interface PlannerViewProps {
  crops: Crop[];
  onSaveGarden: (garden: GardenPlot) => Promise<void>;
  savedGardens: GardenPlot[];
  onSelectGarden: (garden: GardenPlot) => void;
  activeGarden: GardenPlot | null;
  setActiveGarden: (garden: GardenPlot | null) => void;
}

export default function PlannerView({ 
  crops, 
  onSaveGarden, 
  savedGardens, 
  onSelectGarden, 
  activeGarden,
  setActiveGarden
}: PlannerViewProps) {
  
  // Design Dimensions
  const [width, setWidth] = useState(6);
  const [height, setHeight] = useState(4);
  const [gardenName, setGardenName] = useState('My Rooftop Micro-Plot');
  
  // Selected Crop to place
  const [selectedCropId, setSelectedCropId] = useState<string>('tomato');
  const [infoCrop, setInfoCrop] = useState<Crop | null>(crops.find(c => c.id === 'tomato') || null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [arMode, setArMode] = useState(false);

  // Initialize new empty layout when dimensions change or fresh start
  useEffect(() => {
    if (!activeGarden) {
      handleResetGrid();
    } else {
      setGardenName(activeGarden.name);
      setWidth(activeGarden.width);
      setHeight(activeGarden.height);
    }
  }, [activeGarden]);

  const handleResetGrid = () => {
    const emptyPlot: GardenPlot = {
      id: '',
      name: gardenName || 'New Micro-Plot',
      width,
      height,
      layout: {},
      companionStatus: {},
      companionFeedback: {},
      createdAt: new Date().toISOString()
    };
    setActiveGarden(emptyPlot);
  };

  const handleSelectCropForPlacement = (crop: Crop) => {
    setSelectedCropId(crop.id);
    setInfoCrop(crop);
  };

  // Helper to run Companion planting computations
  const computeCompanionStatus = (
    currentLayout: Record<string, string>,
    gWidth: number,
    gHeight: number
  ) => {
    const newStatus: Record<string, 'companion' | 'antagonistic' | 'neutral'> = {};
    const newFeedback: Record<string, string> = {};

    // For each cell in grid
    for (let x = 0; x < gWidth; x++) {
      for (let y = 0; y < gHeight; y++) {
        const coord = `${x},${y}`;
        const currentCropId = currentLayout[coord];
        if (!currentCropId) continue;

        const crop = crops.find(c => c.id === currentCropId);
        if (!crop) continue;

        // Check 8-way adjacent neighbors
        let isCompanion = false;
        let isAntagonistic = false;
        const companionsMet = new Set<string>();
        const antagonistsMet = new Set<string>();

        const neighbors = [
          [-1, -1], [0, -1], [1, -1],
          [-1, 0],           [1, 0],
          [-1, 1],  [0, 1],  [1, 1]
        ];

        for (const [dx, dy] of neighbors) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < gWidth && ny >= 0 && ny < gHeight) {
            const neighborCropId = currentLayout[`${nx},${ny}`];
            if (neighborCropId) {
              const neighborCrop = crops.find(c => c.id === neighborCropId);
              if (neighborCrop) {
                // If crop companion list contains neighbor's name/id
                if (crop.companionPlants.some(p => p.toLowerCase() === neighborCrop.name.toLowerCase() || p.toLowerCase() === neighborCrop.id.toLowerCase())) {
                  isCompanion = true;
                  companionsMet.add(neighborCrop.name);
                }
                if (crop.antagonisticPlants.some(p => p.toLowerCase() === neighborCrop.name.toLowerCase() || p.toLowerCase() === neighborCrop.id.toLowerCase())) {
                  isAntagonistic = true;
                  antagonistsMet.add(neighborCrop.name);
                }
              }
            }
          }
        }

        if (isAntagonistic) {
          newStatus[coord] = 'antagonistic';
          newFeedback[coord] = `Warning: ${crop.name} competes or clashes with nearby ${Array.from(antagonistsMet).join(', ')}. Keep them separated to avoid disease vulnerability or stunted growth.`;
        } else if (isCompanion) {
          newStatus[coord] = 'companion';
          newFeedback[coord] = `Excellent! ${crop.name} is paired with highly beneficial companions: ${Array.from(companionsMet).join(', ')}. Offers integrated organic pest shielding and soil health.`;
        } else {
          newStatus[coord] = 'neutral';
          newFeedback[coord] = `${crop.name} is planted in a neutral, stable cell context. No direct conflicts with neighbors.`;
        }
      }
    }

    return { status: newStatus, feedback: newFeedback };
  };

  // Click handler to place crop
  const handleCellClick = (x: number, y: number) => {
    if (!activeGarden) return;

    const coord = `${x},${y}`;
    const newLayout = { ...activeGarden.layout };
    
    // Toggle/Place logic
    if (newLayout[coord] === selectedCropId) {
      // already contains this crop, remove it (clear cell)
      delete newLayout[coord];
    } else {
      // place selected crop
      newLayout[coord] = selectedCropId;
    }

    // Compute synergy instantly
    const { status, feedback } = computeCompanionStatus(newLayout, width, height);

    setActiveGarden({
      ...activeGarden,
      layout: newLayout,
      companionStatus: status,
      companionFeedback: feedback
    });
  };

  // Quick action: Clear whole plot
  const handleClearAll = () => {
    if (!activeGarden) return;
    setActiveGarden({
      ...activeGarden,
      layout: {},
      companionStatus: {},
      companionFeedback: {}
    });
  };

  // Calculate Synergy Score
  const getSynergyScore = () => {
    if (!activeGarden) return 100;
    const totalPlaced = Object.keys(activeGarden.layout).length;
    if (totalPlaced === 0) return 100;

    let companionCount = 0;
    let antagonisticCount = 0;

    Object.values(activeGarden.companionStatus).forEach(stat => {
      if (stat === 'companion') companionCount++;
      if (stat === 'antagonistic') antagonisticCount++;
    });

    // Score calculation: Base 100, add 10 for each companion, subtract 30 for each clash
    const rawScore = 100 + (companionCount * 15) - (antagonisticCount * 30);
    return Math.min(100, Math.max(10, rawScore));
  };

  // Save layout to API
  const handleSave = async () => {
    if (!activeGarden) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: GardenPlot = {
        ...activeGarden,
        name: gardenName,
        width,
        height
      };
      await onSaveGarden(payload);
      setMessage({ type: 'success', text: 'Garden plot layout secured and saved successfully!' });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to save garden plot layout.' });
    } finally {
      setSaving(false);
    }
  };

  const score = getSynergyScore();

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-emerald-700">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Organic Bio-Architecture</span>
          </div>
          <h2 id="planner-title" className="text-2xl font-sans font-bold text-gray-900 mt-1">Companion Planting Garden Planner</h2>
          <p className="text-xs text-gray-500 mt-0.5">Define your rooftop plot, place plants, and compute companion harmony scores instantly.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {savedGardens.length > 0 && (
            <select
              className="px-3 py-2 text-xs border border-gray-200 bg-gray-50 rounded-xl focus:outline-hidden text-gray-700"
              value={activeGarden?.id || ''}
              onChange={(e) => {
                const selected = savedGardens.find(g => g.id === e.target.value);
                if (selected) {
                  onSelectGarden(selected);
                }
              }}
            >
              <option value="">-- Load Saved Plots --</option>
              {savedGardens.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.width}x{g.height})</option>
              ))}
            </select>
          )}
          <button
            id="btn-fresh-start"
            onClick={() => {
              setActiveGarden(null);
              setGardenName('My Rooftop Micro-Plot');
              setWidth(6);
              setHeight(4);
            }}
            className="px-3.5 py-2 text-xs font-semibold bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl transition cursor-pointer"
          >
            Create New Plot
          </button>
        </div>
      </div>

      {/* Main interactive work workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Plant Selection Tray & Guide (Lg: 4) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs">
            <h3 className="text-sm font-bold text-gray-900 mb-4 pb-2 border-b border-gray-50 flex items-center justify-between">
              <span>Select Seed Varieties</span>
              <span className="text-3xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Click & Plant</span>
            </h3>

            {/* List of Crops */}
            <div className="grid grid-cols-2 gap-2 max-h-[290px] overflow-y-auto pr-1">
              {crops.map(crop => (
                <button
                  key={crop.id}
                  onClick={() => handleSelectCropForPlacement(crop)}
                  className={`p-2.5 rounded-xl border text-left transition-all duration-150 flex items-center gap-2 text-xs font-semibold cursor-pointer ${
                    selectedCropId === crop.id 
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs ring-1 ring-emerald-500' 
                      : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-lg">{crop.icon}</span>
                  <div className="truncate">
                    <span className="block truncate">{crop.name}</span>
                    <span className="text-3xs text-gray-400 font-medium block">Spac. {crop.spacingCm}cm</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Plant Fact Card */}
          {infoCrop && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{infoCrop.icon}</span>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{infoCrop.name} Specs</h4>
                  <span className="text-3xs font-medium text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md">{infoCrop.category}</span>
                </div>
              </div>
              <p className="text-3xs text-gray-500 leading-relaxed">{infoCrop.description}</p>
              
              <div className="grid grid-cols-2 gap-2 text-3xs border-t border-gray-50 pt-2.5">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="block text-gray-400">Growing Cycle</span>
                  <span className="font-bold text-gray-700">{infoCrop.growingDays} days</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="block text-gray-400">Sun Requirement</span>
                  <span className="font-bold text-gray-700">{infoCrop.sunNeeds}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="block text-gray-400">Water Consumption</span>
                  <span className="font-bold text-gray-700">{infoCrop.waterNeeds}</span>
                </div>
                <div className="bg-gray-50 p-2 rounded-lg">
                  <span className="block text-gray-400">Expected Yield</span>
                  <span className="font-bold text-gray-700">{infoCrop.expectedYieldKg} kg/unit</span>
                </div>
              </div>

              {/* Companion notes */}
              <div className="border-t border-gray-50 pt-2.5 space-y-1.5 text-3xs">
                <div>
                  <span className="font-bold text-emerald-700 block">Good Companions:</span>
                  <span className="text-gray-600">{infoCrop.companionPlants.join(', ') || 'None listed'}</span>
                </div>
                {infoCrop.antagonisticPlants.length > 0 && (
                  <div>
                    <span className="font-bold text-amber-700 block">Antagonistic Clashes:</span>
                    <span className="text-gray-600">{infoCrop.antagonisticPlants.join(', ')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Garden Grid Workspace (Lg: 8) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-5 md:p-6 border border-gray-100 shadow-xs space-y-4">
            
            {/* Control Panel: Grid size and Name */}
            <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pb-4 border-b border-gray-50">
              <div className="flex-1 w-full">
                <input
                  type="text"
                  className="w-full text-base font-bold text-gray-800 bg-transparent border-b border-dashed border-gray-200 focus:outline-hidden focus:border-emerald-500 py-1"
                  value={gardenName}
                  onChange={e => setGardenName(e.target.value)}
                  placeholder="Set Plot Identifier"
                />
              </div>
              
              <div className="flex items-center gap-2.5 self-end sm:self-auto shrink-0 text-xs">
                <span className="text-gray-500">Grid Dimensions:</span>
                <select
                  className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden font-semibold text-gray-700"
                  value={width}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWidth(val);
                    handleResetGrid();
                  }}
                >
                  {[4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} columns</option>)}
                </select>
                <span className="text-gray-300">×</span>
                <select
                  className="px-2 py-1 bg-gray-50 border border-gray-200 rounded-lg focus:outline-hidden font-semibold text-gray-700"
                  value={height}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setHeight(val);
                    handleResetGrid();
                  }}
                >
                  {[3, 4, 5, 6].map(n => <option key={n} value={n}>{n} rows</option>)}
                </select>
              </div>
            </div>

            {/* Synergy Gauge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-emerald-50/50 rounded-xl border border-emerald-100 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                  {score}%
                </div>
                <div>
                  <span className="text-xs font-bold text-emerald-950 block">Garden Companion Synergy Score</span>
                  <p className="text-3xs text-emerald-700 leading-tight">
                    {score >= 80 ? 'Perfect harmony. High pest immunity and organic nutrient circulation!' :
                     score >= 50 ? 'Stable composition. Consider separating antagonistic items.' :
                     'Severe clashes present! Yield limits expected.'}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setArMode(!arMode)}
                  className={`px-3 py-1.5 rounded-lg text-3xs font-extrabold border transition flex items-center gap-1.5 cursor-pointer ${
                    arMode 
                      ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
                      : 'text-purple-700 hover:bg-purple-50 border-purple-200 bg-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-300" />
                  {arMode ? 'Exit AR View' : 'AR 3D Projection'}
                </button>
                <button
                  id="btn-clear-plot"
                  onClick={handleClearAll}
                  className="px-3 py-1.5 rounded-lg text-3xs font-semibold text-gray-500 hover:text-red-700 bg-white hover:bg-red-50 border border-gray-200 hover:border-red-100 transition flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Wipe Layout
                </button>
                <button
                  id="btn-save-plot"
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg text-3xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 shadow-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Secure Plan'}
                </button>
              </div>
            </div>

            {message && (
              <div className={`p-2.5 text-xs rounded-lg font-medium text-center border ${
                message.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'
              }`}>
                {message.text}
              </div>
            )}

            {/* Holographic 3D AR Simulator / 2D Grid Drawing Board */}
            {activeGarden && (
              arMode ? (
                /* Interactive Holographic isometric 3D AR Simulator Panel */
                <div className="bg-linear-to-b from-gray-900 to-slate-950 p-6 rounded-2xl border border-purple-900/40 relative overflow-hidden text-white shadow-xl animate-fadeIn">
                  
                  {/* Floating particle effect decorations (Nature tech) */}
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.08)_0%,transparent_70%)] pointer-events-none" />
                  
                  {/* Simulator header status indicator */}
                  <div className="flex justify-between items-center pb-3 border-b border-white/10 relative z-10 text-xs font-mono">
                    <div className="flex items-center gap-1.5 text-purple-400">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping" />
                      <span className="font-bold">WEBXR HOLOGRAM PROJECTION SYSTEM ACTIVE</span>
                    </div>
                    <span className="text-gray-400 text-3xs bg-white/5 border border-white/10 px-2 py-0.5 rounded-md">PASS-THROUGH MODE</span>
                  </div>

                  {/* 3D Isometric Viewport Container */}
                  <div className="relative h-[320px] flex items-center justify-center overflow-hidden my-4">
                    
                    {/* Isometric Garden Stage Transform Container */}
                    <div 
                      className="relative transition-transform duration-500 ease-out flex flex-col items-center justify-center"
                      style={{ 
                        transform: 'rotateX(60deg) rotateZ(-45deg) translateY(-20px)',
                        transformStyle: 'preserve-3d'
                      }}
                    >
                      {/* Grid cells layered in 3D */}
                      <div 
                        className="grid gap-3 p-4 bg-emerald-950/45 rounded-2xl border border-emerald-500/20 shadow-lg relative"
                        style={{ 
                          gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
                          transform: 'translateZ(10px)',
                          transformStyle: 'preserve-3d'
                        }}
                      >
                        {Array.from({ length: height }).map((_, y) => (
                          Array.from({ length: width }).map((_, x) => {
                            const coord = `${x},${y}`;
                            const cropId = activeGarden.layout[coord];
                            const placedCrop = crops.find(c => c.id === cropId);
                            const status = activeGarden.companionStatus[coord];

                            let baseBg = 'bg-slate-800/80 border-slate-700 hover:bg-emerald-950/50';
                            let heightOffset = 'translateZ(0px)';
                            
                            if (placedCrop) {
                              heightOffset = 'translateZ(24px)';
                              baseBg = status === 'companion' 
                                ? 'bg-emerald-900/90 border-emerald-400' 
                                : status === 'antagonistic'
                                  ? 'bg-rose-950/90 border-rose-400'
                                  : 'bg-teal-900/90 border-teal-500';
                            }

                            return (
                              <div
                                key={coord}
                                className={`w-12 h-12 md:w-14 md:h-14 rounded-xl border flex flex-col items-center justify-center transition-all duration-300 relative select-none ${baseBg}`}
                                style={{ 
                                  transform: heightOffset,
                                  transformStyle: 'preserve-3d',
                                  boxShadow: placedCrop ? '0px 10px 20px rgba(0,0,0,0.5)' : 'none'
                                }}
                              >
                                {placedCrop ? (
                                  <div className="text-center transform flex flex-col items-center justify-center select-none" style={{ transform: 'rotateZ(45deg) rotateX(-60deg)' }}>
                                    <span className="text-2xl animate-pulse block select-none">{placedCrop.icon}</span>
                                    <span className="text-[7px] text-white/90 font-bold block mt-0.5 truncate select-none">{placedCrop.name}</span>
                                    {status === 'companion' && (
                                      <span className="absolute -top-3 -right-3 text-[9px] animate-bounce select-none">🌟</span>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-center opacity-30 select-none">
                                    <span className="text-[8px] font-mono block text-emerald-400">{x},{y}</span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ))}
                      </div>

                    </div>

                    {/* Left holographic HUD info panel */}
                    <div className="absolute left-2 bottom-2 bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 max-w-[170px] text-[9px] text-gray-300 space-y-1.5 z-20">
                      <span className="font-extrabold text-purple-400 uppercase tracking-wider block font-mono border-b border-white/10 pb-1">Hologram Telemetry</span>
                      <div className="flex justify-between"><span>Soil Temp</span><span className="text-emerald-400">23.4°C</span></div>
                      <div className="flex justify-between"><span>Micro-Rain</span><span className="text-emerald-400">Optimum</span></div>
                      <div className="flex justify-between"><span>Protected Area</span><span className="text-purple-400 font-bold">{Object.keys(activeGarden.layout).length * 15}%</span></div>
                    </div>

                    {/* Right holographic HUD info panel */}
                    <div className="absolute right-2 bottom-2 bg-black/70 backdrop-blur-md p-3 rounded-xl border border-white/10 max-w-[170px] text-[9px] text-gray-300 space-y-1.5 z-20">
                      <span className="font-extrabold text-emerald-400 uppercase tracking-wider block font-mono border-b border-white/10 pb-1">Agronomist Sync</span>
                      <div className="flex justify-between"><span>Synergy Rating</span><span className="text-emerald-400 font-bold">{score}%</span></div>
                      <div className="flex justify-between"><span>Height Layer</span><span className="text-emerald-400">Responsive</span></div>
                      <div className="flex justify-between"><span>WebXR Status</span><span className="text-purple-400">Ready</span></div>
                    </div>

                  </div>

                  {/* Simulator footer instructions */}
                  <div className="text-center py-2 relative z-10 border-t border-white/5">
                    <span className="text-3xs text-purple-300 font-semibold uppercase tracking-wider">
                      Interactive Holographic Projection complete. Switch back to 2D view above to add or clear crops.
                    </span>
                  </div>

                </div>
              ) : (
                /* Standard 2D Grid Drawing Board */
                <div className="relative overflow-x-auto py-2">
                  <div className="mx-auto min-w-[340px] max-w-[500px]">
                    <div 
                      className="grid gap-2 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl"
                      style={{ 
                        gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` 
                      }}
                    >
                      {Array.from({ length: height }).map((_, y) => (
                        Array.from({ length: width }).map((_, x) => {
                          const coord = `${x},${y}`;
                          const cropId = activeGarden.layout[coord];
                          const placedCrop = crops.find(c => c.id === cropId);
                          const status = activeGarden.companionStatus[coord];

                          let borderClass = 'border-gray-200 hover:border-emerald-400 bg-white';
                          let glowDot = null;

                          if (status === 'companion') {
                            borderClass = 'border-emerald-500 bg-emerald-50/70 hover:bg-emerald-50 ring-1 ring-emerald-300';
                            glowDot = <span className="absolute top-1 right-1 text-3xs animate-bounce">🌟</span>;
                          } else if (status === 'antagonistic') {
                            borderClass = 'border-red-400 bg-red-50/70 hover:bg-red-50 ring-1 ring-red-300';
                            glowDot = <span className="absolute top-1 right-1 text-3xs">⚠️</span>;
                          }

                          return (
                            <button
                              key={coord}
                              onClick={() => handleCellClick(x, y)}
                              className={`relative aspect-square rounded-xl border flex flex-col items-center justify-center transition-all duration-150 group cursor-pointer ${borderClass}`}
                            >
                              {placedCrop ? (
                                <>
                                  <span className="text-xl md:text-2xl group-hover:scale-110 transition duration-150">{placedCrop.icon}</span>
                                  <span className="text-3xs text-gray-500 font-bold block truncate max-w-full px-1 mt-0.5">{placedCrop.name}</span>
                                  {glowDot}
                                </>
                              ) : (
                                <div className="text-center">
                                  <Plus className="w-4 h-4 text-gray-300 mx-auto group-hover:text-emerald-500 group-hover:scale-125 transition" />
                                  <span className="text-4xs text-gray-400 font-medium block mt-1">{x},{y}</span>
                                </div>
                              )}
                            </button>
                          );
                        })
                      ))}
                    </div>
                  </div>
                </div>
              )
            )}

            {/* Instruction Footer */}
            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100 flex items-start gap-2 text-3xs text-gray-500 leading-relaxed">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-gray-700 block">How to Plan:</span>
                Select a variety from the tray (e.g., Tomato), then click any cell on the plot. To clear a cell, click it again. The synergy score automatically updates based on companion rules. Green plots are optimized, and red ones clash!
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
