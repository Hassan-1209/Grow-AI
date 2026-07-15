import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, MessageSquare, Heart, Share2, Tag, 
  Send, Bot, Bookmark, Sparkles, User, RefreshCw, Eye, BookOpen, Check, ShieldAlert
} from 'lucide-react';
import { CommunityPost, UserProfile } from '../types';

interface CommunityFeedViewProps {
  posts: CommunityPost[];
  onAddPost: (post: Omit<CommunityPost, 'id' | 'likes' | 'likedByUser' | 'comments' | 'date'>) => Promise<void>;
  onLikePost: (postId: string) => Promise<void>;
  onAddComment: (postId: string, author: string, content: string) => Promise<void>;
  userProfile: UserProfile;
  onRefreshCredits: () => void;
  aiCredits: { remaining: number; total: number; used: number };
}

export default function CommunityFeedView({ 
  posts, 
  onAddPost, 
  onLikePost, 
  onAddComment,
  userProfile,
  onRefreshCredits,
  aiCredits
}: CommunityFeedViewProps) {
  // Create Post
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [role, setRole] = useState<'Grower' | 'Organizer' | 'Expert'>('Grower');
  const [authorName, setAuthorName] = useState('');

  const [saving, setSaving] = useState(false);

  // Comments inputs (per post ID)
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [commentAuthors, setCommentAuthors] = useState<Record<string, string>>({});

  // Active sub-tab inside Community Section
  const [activeTab, setActiveTab] = useState<'feed' | 'journal'>('feed');

  // Personal Progress Journal State (Rich timeline + AI Insights)
  const [journalEntries, setJournalEntries] = useState<Array<{
    id: string;
    title: string;
    content: string;
    date: string;
    weather: string;
    imageUrl?: string;
    aiInsight?: string;
  }>>([
    {
      id: 'journal-1',
      title: 'First basil and spinach seedlings sprouted!',
      content: 'Woke up today and saw green tiny cotyledons in my third container box. The organic worm castings soil seem to be holding moisture perfectly. Measured pH at 6.4 which is exactly in the sweet zone.',
      date: new Date(Date.now() - 3 * 24 * 3600000).toISOString(),
      weather: 'Sunny',
      imageUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=600&auto=format&fit=crop&q=60',
      aiInsight: `### 🌿 GrowLocal AI Journal Insights

Your log **"First basil and spinach seedlings sprouted!"** indicates excellent proactive management!

*   **pH Stability Zone**: Having a steady soil pH of 6.4 is pristine for young spinach. Avoid any lime dressings for the next 4 weeks to maintain this gentle acidity.
*   **Moisture & Cotyledon Care**: Keep watering gently using misting bottles only. Heavy water flows can uproot delicate sprout fibers at this stage.`
    },
    {
      id: 'journal-2',
      title: 'Constructed timber climbing trellis',
      content: 'Built a 6ft diagonal modular wooden trellis today for the tomato and bean plot. Applied eco-friendly water seal so we do not leach chemicals into the crop soil.',
      date: new Date(Date.now() - 1 * 24 * 3600000).toISOString(),
      weather: 'Cloudy',
      imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format&fit=crop&q=60'
    }
  ]);

  // Form states for progress journal
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalWeather, setJournalWeather] = useState('Sunny');
  const [journalImage, setJournalImage] = useState('');
  const [analyzingJournal, setAnalyzingJournal] = useState(false);
  const [journalError, setJournalError] = useState<string | null>(null);

  // Journal preset images (beautiful nature choices for easy selection!)
  const PRESET_IMAGES = [
    { name: 'Basil Sprout', url: 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?w=600&auto=format&fit=crop&q=60' },
    { name: 'Rooftop Plot', url: 'https://images.unsplash.com/photo-1530595467537-0b5996c41f2d?w=600&auto=format&fit=crop&q=60' },
    { name: 'Tomato Trellis', url: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=600&auto=format&fit=crop&q=60' },
    { name: 'Compost Soil', url: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=600&auto=format&fit=crop&q=60' }
  ];

  const handleCreateJournalEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!journalTitle || !journalContent) return;

    setAnalyzingJournal(true);
    setJournalError(null);

    const newId = `journal-${Date.now()}`;
    const newEntry = {
      id: newId,
      title: journalTitle,
      content: journalContent,
      date: new Date().toISOString(),
      weather: journalWeather,
      imageUrl: journalImage || undefined,
      aiInsight: undefined as string | undefined
    };

    // Pre-add the entry optimistically
    setJournalEntries(prev => [newEntry, ...prev]);

    // Clear form
    setJournalTitle('');
    setJournalContent('');
    setJournalImage('');

    try {
      const res = await fetch('/api/analyze-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEntry.title,
          content: newEntry.content,
          weather: newEntry.weather,
          userProfile
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          // Update the entry with AI insight
          setJournalEntries(prev => prev.map(entry => entry.id === newId ? { ...entry, aiInsight: data.text } : entry));
          onRefreshCredits();
        }
      } else if (res.status === 429) {
        const data = await res.json();
        setJournalError(data.message || 'AI request limit reached for today.');
      }
    } catch (err) {
      console.error('Failed to analyze progress journal entry:', err);
    } finally {
      setAnalyzingJournal(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !authorName) return;

    setSaving(true);
    try {
      const tags = tagsInput
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);

      // Random background color for avatars
      const bgColors = [
        'bg-emerald-600 text-white',
        'bg-teal-600 text-white',
        'bg-sky-600 text-white',
        'bg-amber-600 text-white',
        'bg-purple-600 text-white'
      ];
      const randomAvatar = bgColors[Math.floor(Math.random() * bgColors.length)];

      await onAddPost({
        author: authorName,
        authorRole: role,
        avatar: randomAvatar,
        title,
        content,
        tags,
        imageUrl: imageUrl || undefined
      });

      // Reset
      setTitle('');
      setContent('');
      setTagsInput('');
      setImageUrl('');
      setAuthorName('');
      setIsFormOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handlePostLike = async (postId: string) => {
    await onLikePost(postId);
  };

  const handlePostComment = async (postId: string) => {
    const text = commentInputs[postId];
    const author = commentAuthors[postId] || 'Anonymous Grower';
    if (!text || !text.trim()) return;

    try {
      await onAddComment(postId, author, text);
      // Clear input
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    } catch (err) {
      console.error(err);
    }
  };

  const getRoleBadgeColor = (r: string) => {
    switch (r) {
      case 'Expert': return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Municipal': return 'text-sky-800 bg-sky-50 border-sky-200';
      case 'Organizer': return 'text-purple-800 bg-purple-50 border-purple-200';
      default: return 'text-emerald-800 bg-emerald-50 border-emerald-200';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-700">
            <Users className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Social Agricultural Network</span>
          </div>
          <h2 id="community-header" className="text-2xl font-sans font-bold text-gray-900 mt-1">Community Resilience Feed</h2>
          <p className="text-xs text-gray-500 mt-0.5">Share seasonal progress logs, request cooperative advice, and mobilize neighborhood community planting events.</p>
        </div>
        <div className="flex gap-3 shrink-0">
          <button
            id="btn-open-create-post"
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Share Progress Log
          </button>
        </div>
      </div>

      {/* Sub-Tab Selection Bar (Nature-inspired styled) */}
      <div className="flex gap-2 p-1 bg-emerald-950/5 border border-emerald-900/10 rounded-xl max-w-xs text-xs font-bold">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'feed'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-500 hover:text-emerald-700'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Bulletin Feed</span>
        </button>
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex-1 py-2 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'journal'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-gray-500 hover:text-emerald-700'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>My Journal</span>
        </button>
      </div>

      {activeTab === 'feed' ? (
        /* Grid: Left Column is Post feed, Right Column is announcements/pinned items */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Forum feed (Lg: 8) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Post Creation Form */}
            {isFormOpen && (
              <form onSubmit={handleCreatePost} className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-md space-y-4 text-xs animate-fadeIn">
                <div className="pb-3 border-b border-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-gray-900">Publish Progress Log</h3>
                  <span className="text-4xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Broadcast to SF Growers</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Your Identifier / Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Chloe Smith"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={authorName}
                      onChange={e => setAuthorName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Your Garden Role</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={role}
                      onChange={e => setRole(e.target.value as any)}
                    >
                      <option value="Grower">Backyard/Rooftop Grower</option>
                      <option value="Organizer">Community Garden Organizer</option>
                      <option value="Expert">Agronomist / Botany Expert</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Progress Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Succcess! My first companion harvest is yielding heavy tomatoes."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Log Content</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Describe your progress, milestones, issues, or request assistance. Keep it community-oriented and collaborative!"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                    value={content}
                    onChange={e => setContent(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Comma-separated tags</label>
                    <input
                      type="text"
                      placeholder="e.g., CompanionPlanting, TomatoSurplus, Composting"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={tagsInput}
                      onChange={e => setTagsInput(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Image URL (Optional)</label>
                    <input
                      type="url"
                      placeholder="Paste online photo URL"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    {saving ? 'Publishing...' : 'Publish Log'}
                  </button>
                </div>
              </form>
            )}

            {/* Posts Feed */}
            <div className="space-y-6">
              {posts.map(post => (
                <article key={post.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-3xs space-y-4">
                  
                  {/* Author row */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shadow-3xs ${post.avatar}`}>
                        {post.author[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-900">{post.author}</span>
                          <span className={`text-4xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${getRoleBadgeColor(post.authorRole)}`}>
                            {post.authorRole}
                          </span>
                        </div>
                        <span className="text-4xs text-gray-400 font-medium block mt-0.5">{new Date(post.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-emerald-700 p-1.5 rounded-lg hover:bg-gray-50">
                      <Bookmark className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-gray-900">{post.title}</h3>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans">{post.content}</p>
                    
                    {post.imageUrl && (
                      <img 
                        src={post.imageUrl} 
                        alt={post.title} 
                        referrerPolicy="no-referrer"
                        className="w-full max-h-72 object-cover rounded-xl border border-gray-200"
                      />
                    )}

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.map((tag, i) => (
                          <span key={i} className="inline-flex items-center gap-1 text-3xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                            <Tag className="w-2.5 h-2.5 text-emerald-600" /> #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-6 pt-3.5 border-t border-gray-50 text-xs">
                    <button
                      onClick={() => handlePostLike(post.id)}
                      className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                        post.likedByUser ? 'text-red-600 font-bold' : 'text-gray-500 hover:text-red-600'
                      }`}
                    >
                      <Heart className={`w-4.5 h-4.5 ${post.likedByUser ? 'fill-red-600 stroke-red-600' : ''}`} />
                      <span>{post.likes} Likes</span>
                    </button>
                    <span className="flex items-center gap-1.5 text-gray-500">
                      <MessageSquare className="w-4.5 h-4.5" />
                      <span>{post.comments.length} Comments</span>
                    </span>
                    <button className="flex items-center gap-1.5 text-gray-500 hover:text-emerald-700 transition-colors ml-auto">
                      <Share2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>

                  {/* Comments Thread */}
                  <div className="border-t border-gray-50/50 pt-4 space-y-3 bg-gray-50/40 -mx-5 -mb-5 p-5 rounded-b-2xl">
                    {post.comments.length > 0 && (
                      <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                        {post.comments.map(c => (
                          <div key={c.id} className="bg-white p-3 rounded-xl border border-gray-50 shadow-4xs space-y-1">
                            <div className="flex justify-between text-3xs font-bold text-gray-800">
                              <span>{c.author}</span>
                              <span className="text-gray-400 font-medium">{new Date(c.date).toLocaleDateString()}</span>
                            </div>
                            <p className="text-3xs text-gray-600 leading-normal font-sans">{c.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add comment Form */}
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Your Name (Optional)"
                        value={commentAuthors[post.id] || ''}
                        onChange={e => setCommentAuthors(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="text-4xs px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg focus:outline-hidden max-w-[140px] truncate"
                      />
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          placeholder="Add to cooperation discussion..."
                          value={commentInputs[post.id] || ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          className="flex-1 text-3xs px-3 py-1.5 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:border-emerald-500"
                        />
                        <button
                          onClick={() => handlePostComment(post.id)}
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-3xs font-bold transition flex items-center justify-center cursor-pointer"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>

                </article>
              ))}
            </div>
          </div>

          {/* Resilience Forum Side Widget (Lg: 4) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Cooperative Projects Widget */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-gray-900 pb-2 border-b border-gray-50 flex items-center gap-1.5">
                <Users className="w-4.5 h-4.5 text-emerald-600" />
                <span>Cooperative Community Gardens</span>
              </h3>

              <div className="space-y-3 text-3xs text-gray-600 leading-relaxed">
                
                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 block">Hayes Valley Food Hub</span>
                  <span>Active project scaling rooftop leafy greens. Seed swap mapped for Hayes community. Volunteers welcome Saturdays 9 AM to 1 PM.</span>
                  <div className="pt-1.5">
                    <span className="font-semibold text-emerald-800 bg-white border border-emerald-100 px-2 py-0.5 rounded-md">8,500 sq ft</span>
                  </div>
                </div>

                <div className="bg-emerald-50/40 p-3 rounded-xl border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 block">Mission Rooftop Coop</span>
                  <span>Cooperative carbon-tracking experiment. Testing deep-mulching systems on tomato vines. Powered by GrowLocal Telemetry.</span>
                  <div className="pt-1.5">
                    <span className="font-semibold text-emerald-800 bg-white border border-emerald-100 px-2 py-0.5 rounded-md">3,200 sq ft</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Guidelines on food sovereignty */}
            <div className="bg-linear-to-b from-emerald-900 to-teal-950 p-5 rounded-2xl text-white space-y-3.5 border border-emerald-800 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                <h4 className="text-xs font-bold">Food Sovereignty Vision</h4>
              </div>
              <p className="text-3xs text-emerald-100 leading-relaxed">
                Urban micro-farming is the cornerstone of community-scale food resilience. Producing just 15% of vegetable needs locally in neighborhood community networks lowers transport miles, isolates communities from supply failures, and lowers micro-climate temperatures.
              </p>
              <div className="pt-1 border-t border-white/10 text-4xs font-mono text-emerald-300">
                GrowLocal AI - Building Climate Autonomy
              </div>
            </div>

          </div>

        </div>
      ) : (
        /* My Personal Progress Journal Space */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
          
          {/* Left Column: Log Entry Form (lg: 5) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 shadow-sm space-y-4 text-xs">
              <div className="pb-3 border-b border-gray-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-emerald-600" />
                  <span>Log Daily Achievement</span>
                </h3>
                <span className="text-4xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-bold uppercase tracking-wider">Private Journal</span>
              </div>

              <form onSubmit={handleCreateJournalEntry} className="space-y-4">
                <div>
                  <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Journal Entry Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Added liquid worm tea to rooftop boxes"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-gray-50/50"
                    value={journalTitle}
                    onChange={e => setJournalTitle(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Weather Context</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-200 bg-white rounded-lg focus:outline-hidden focus:border-emerald-500"
                      value={journalWeather}
                      onChange={e => setJournalWeather(e.target.value)}
                    >
                      <option value="Sunny">☀️ Sunny</option>
                      <option value="Cloudy">☁️ Cloudy</option>
                      <option value="Rainy">🌧️ Rainy</option>
                      <option value="Windy">💨 Windy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Custom Photo URL (Opt)</label>
                    <input
                      type="url"
                      placeholder="e.g. https://unsplash..."
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-gray-50/50"
                      value={journalImage}
                      onChange={e => setJournalImage(e.target.value)}
                    />
                  </div>
                </div>

                {/* Preset Horticultural Photo Selector (Premium UX) */}
                <div>
                  <label className="block text-3xs font-bold text-gray-500 uppercase mb-1.5">Quick-Select Nature Asset</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRESET_IMAGES.map((img, i) => {
                      const isSelected = journalImage === img.url;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setJournalImage(img.url)}
                          className={`group relative h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                            isSelected ? 'border-emerald-500 shadow-md scale-95' : 'border-gray-200 hover:border-emerald-300'
                          }`}
                        >
                          <img src={img.url} alt={img.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <div className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-[8px] text-white text-center font-semibold truncate px-1">
                            {img.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-3xs font-bold text-gray-500 uppercase mb-1">Journal Notes</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Log daily growth milestones, pruning, pH sensor readings, watering times, or crop changes. GrowLocal AI will analyze these notes to deliver personalized advice."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-hidden focus:border-emerald-500 bg-gray-50/50"
                    value={journalContent}
                    onChange={e => setJournalContent(e.target.value)}
                  />
                </div>

                {journalError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800 text-3xs font-semibold flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{journalError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={analyzingJournal}
                  className="w-full py-2.5 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {analyzingJournal ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                  )}
                  <span>{analyzingJournal ? 'Analyzing with AI...' : 'Analyze with GrowLocal AI'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Personal Journal Timeline & AI Insights (lg: 7) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI analyzing skeleton banner */}
            {analyzingJournal && (
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4.5 rounded-2xl border border-emerald-200/50 shadow-xs flex items-center gap-3.5 animate-pulse">
                <RefreshCw className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold text-emerald-950 text-xs block">AI Agronomist Calibrating Insights...</span>
                  <p className="text-3xs text-gray-500">Reading your daily log notes, comparing crop profiles, and checking local weather records to formulate customized organic solutions.</p>
                </div>
              </div>
            )}

            {/* Journal Entries List */}
            <div className="space-y-6">
              {journalEntries.length === 0 ? (
                <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center space-y-3.5">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div className="max-w-xs mx-auto">
                    <span className="font-bold text-gray-900 block text-xs">Your Progress Journal is Empty</span>
                    <p className="text-3xs text-gray-500 mt-1">Write your first log on the left. Real-time agricultural advice will dynamically load below each post.</p>
                  </div>
                </div>
              ) : (
                journalEntries.map(entry => (
                  <div key={entry.id} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-3xs space-y-4.5">
                    
                    {/* Header Row */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-gray-50">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug">{entry.title}</h4>
                        <span className="text-4xs text-gray-400 font-semibold block mt-0.5">
                          {new Date(entry.date).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-3xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-lg shrink-0">
                        {entry.weather === 'Sunny' ? '☀️ Sunny' : entry.weather === 'Cloudy' ? '☁️ Cloudy' : entry.weather === 'Rainy' ? '🌧️ Rainy' : '💨 Windy'}
                      </span>
                    </div>

                    {/* Content */}
                    <p className="text-xs text-gray-600 leading-relaxed font-sans">{entry.content}</p>

                    {entry.imageUrl && (
                      <div className="rounded-xl overflow-hidden border border-gray-200 max-h-56">
                        <img src={entry.imageUrl} alt={entry.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      </div>
                    )}

                    {/* AI Insights Card Block */}
                    {entry.aiInsight ? (
                      <div className="bg-emerald-50/45 rounded-xl border border-emerald-100/70 p-4 space-y-2.5 shadow-4xs">
                        <div className="flex items-center gap-1.5 text-emerald-900 font-bold text-3xs border-b border-emerald-200/40 pb-1.5">
                          <Bot className="w-4 h-4 text-emerald-600" />
                          <span>GrowLocal AI Horticultural Analysis</span>
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse ml-auto" />
                        </div>
                        <div className="text-3xs text-emerald-950 font-sans leading-relaxed white-space-pre-wrap select-text markdown-body">
                          {entry.aiInsight.split('\n').map((line, idx) => {
                            if (line.startsWith('### ')) {
                              return <h5 key={idx} className="font-bold text-emerald-950 text-xs mt-3 mb-1">{line.replace('### ', '')}</h5>;
                            }
                            if (line.startsWith('* ')) {
                              return <li key={idx} className="ml-3 list-disc mt-1 text-emerald-900 font-medium">{line.replace('* ', '')}</li>;
                            }
                            if (line.trim().length === 0) {
                              return <div key={idx} className="h-1.5" />;
                            }
                            // Formatted text check
                            return <p key={idx} className="mt-1 font-medium">{line}</p>;
                          })}
                        </div>
                      </div>
                    ) : (
                      !analyzingJournal && (
                        <div className="text-4xs text-gray-400 font-medium flex items-center gap-1">
                          <Bot className="w-3.5 h-3.5" />
                          <span>Standard offline entry logged. Requesting insights uses 1 AI Credit.</span>
                        </div>
                      )
                    )}

                  </div>
                ))
              )}
            </div>

          </div>

        </div>
      )}
    </div>
  );
}
