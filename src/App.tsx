import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Eye, 
  Map as MapIcon, 
  FileText, 
  Search, 
  ChevronRight, 
  TrendingUp, 
  Layers, 
  MessageSquare,
  Download,
  Link as LinkIcon,
  Share2,
  History,
  Target,
  Globe,
  Loader2,
  Info,
  BarChart3,
  Sun,
  Moon,
  Check
} from 'lucide-react';
import { trendService, Signal, PrioritizedTrend, TrendInsight } from './services/trendService';
import pptxgen from "pptxgenjs";

type Step = 'idle' | 'eye' | 'map' | 'describe';

export default function App() {
  const [dark, setDark] = useState(() => window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  const [topic, setTopic] = useState('');
  const [step, setStep] = useState<Step>('idle');
  const [signals, setSignals] = useState<Signal[]>([]);
  const [trends, setTrends] = useState<PrioritizedTrend[]>([]);
  const [insights, setInsights] = useState<Record<string, TrendInsight>>({});
  const [landscapeSummary, setLandscapeSummary] = useState<string>("");
  const [selectedTrendId, setSelectedTrendId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTrendId, setLoadingTrendId] = useState<string | null>(null);
  const [isGeneratingPPTX, setIsGeneratingPPTX] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedTrend = selectedTrendId ? insights[selectedTrendId] : null;

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setLoading(true);
    setError(null);
    setStep('eye');
    setSignals([]);
    setTrends([]);
    setInsights({});
    setSelectedTrendId(null);

    try {
      // 1. Eye.ai - Discover
      const discovery = await trendService.discoverSignals(topic);
      setLandscapeSummary(discovery.summary);
      setSignals(discovery.signals);
      
      // 2. Map.ai - Prioritize
      setStep('map');
      const prioritized = await trendService.prioritizeTrends(discovery.signals);
      setTrends(prioritized);
      
      setStep('describe');
    } catch (err) {
      setError('Failed to process trends. Please try again.');
      setStep('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTrend = async (trend: PrioritizedTrend) => {
    setSelectedTrendId(trend.id);
    if (insights[trend.id]) return;

    setLoadingTrendId(trend.id);
    try {
      const insight = await trendService.explainTrend(trend, topic);
      setInsights(prev => ({ ...prev, [trend.id]: insight }));
    } catch (err) {
      setError('Failed to generate insight.');
    } finally {
      setLoadingTrendId(null);
    }
  };

  const handleShare = () => {
    if (!selectedTrend) return;
    const text = `${selectedTrend.title}\n\n${selectedTrend.keyInsight}\n\nSource: ${selectedTrend.sourceUrl || ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownload = () => {
    const currentInsight = selectedTrend;
    if (!currentInsight) return;
    const content = `
TRENDWEAVER INSIGHT REPORT
Topic: ${topic}
Trend: ${currentInsight.title}
Score: ${currentInsight.score}/100
Quadrant: ${currentInsight.quadrant}

KEY INSIGHT:
${currentInsight.keyInsight}

IMPLICATION:
${currentInsight.implication}

NARRATIVE:
${currentInsight.narrative}

CATEGORY CONTEXT:
${currentInsight.categoryContext}

MACRO CONTEXT:
${currentInsight.macroContext}

EXAMPLES:
${currentInsight.examples.map((ex, i) => `${i + 1}. ${ex}`).join('\n')}

SOURCE:
${currentInsight.sourceCitation}
URL: ${currentInsight.sourceUrl}

RELATED SIGNALS:
${currentInsight.relatedSignals.join(', ')}
    `;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trend-report-${currentInsight.title.toLowerCase().replace(/\s+/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPPTX = async () => {
    if (trends.length === 0) return;
    setIsGeneratingPPTX(true);

    try {
      // Fetch missing insights
      const missingTrends = trends.filter(t => !insights[t.id]);
      const newInsights: Record<string, TrendInsight> = { ...insights };

      if (missingTrends.length > 0) {
        // Fetch in sequence to avoid rate limits and ensure stability
        for (const trend of missingTrends) {
          setLoadingTrendId(trend.id);
          const insight = await trendService.explainTrend(trend, topic);
          newInsights[trend.id] = insight;
          setInsights(prev => ({ ...prev, [trend.id]: insight }));
        }
        setLoadingTrendId(null);
      }

      const pres = new pptxgen();
      pres.layout = 'LAYOUT_16x9';

      // 1. Title Slide
      const titleSlide = pres.addSlide();
      titleSlide.background = { color: '0A192F' };
      titleSlide.addText("TRENDWEAVER", { x: 0.5, y: 3.0, fontSize: 54, color: 'FFFFFF', bold: true, fontFace: 'Arial' });
      titleSlide.addText("Foresight in Motion", { x: 0.5, y: 3.8, fontSize: 28, color: 'FF6321', fontFace: 'Arial' });
      titleSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 4.5, w: 9, h: 0, line: { color: 'FF6321', width: 2 } });
      titleSlide.addText(`Topic: ${topic.toUpperCase()}`, { x: 0.5, y: 4.8, fontSize: 20, color: 'FFFFFF', fontFace: 'Arial' });
      titleSlide.addText(`Date: March 2026`, { x: 0.5, y: 5.3, fontSize: 14, color: 'FFFFFF', fontFace: 'Arial' });
      titleSlide.addText("By: BRANDSCAPES WORLDWIDE", { x: 0.5, y: 6.2, fontSize: 16, color: 'FF6321', bold: true, fontFace: 'Arial' });

      // 2. Methodology Slide
      const methodSlide = pres.addSlide();
      methodSlide.addText("METHODOLOGY: THE 3R CHECK", { x: 0.5, y: 0.5, fontSize: 24, color: '0A192F', bold: true });
      methodSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.0, w: 9, h: 0, line: { color: 'FF6321', width: 1 } });
      
      methodSlide.addText("RELIABLE: Credible sources of truth\nRECENT: Freshness is given precedence (last 6 months)\nRECURRING: To filter out fads by identifying patterns", { x: 0.5, y: 1.5, w: 9, fontSize: 16, color: '333333', lineSpacing: 24 });
      
      methodSlide.addText("DIMENSIONS SCANNED", { x: 0.5, y: 3.5, fontSize: 20, color: 'FF6321', bold: true });
      methodSlide.addText("MACRO: Economic, Tech, Politics, Legal, Environment\nCULTURE: Religion, Art, Language, Customs, Social Structure\nPERSONAL: Needs, Concerns, Fears, Desires, Ambitions", { x: 0.5, y: 4.2, w: 9, fontSize: 14, color: '333333', lineSpacing: 20 });

      // 3. Landscape Summary Slide
      const landscapeSlide = pres.addSlide();
      landscapeSlide.addText("LANDSCAPE SUMMARY", { x: 0.5, y: 0.5, fontSize: 24, color: '0A192F', bold: true });
      landscapeSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.0, w: 9, h: 0, line: { color: 'FF6321', width: 1 } });
      landscapeSlide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.5, w: 9, h: 4, fill: { color: 'F0F4F8' }, line: { color: '0A192F', width: 1 } });
      landscapeSlide.addText(landscapeSummary, { x: 0.8, y: 1.8, w: 8.4, h: 3.4, fontSize: 20, color: '0A192F', italic: true, align: 'center', valign: 'middle' });

      // 4. Trend Matrix Slide
      const matrixSlide = pres.addSlide();
      matrixSlide.addText("TREND PRIORITIZATION MATRIX", { x: 0.5, y: 0.5, fontSize: 24, color: '0A192F', bold: true });
      matrixSlide.addShape(pres.ShapeType.line, { x: 0.5, y: 1.0, w: 9, h: 0, line: { color: 'FF6321', width: 1 } });
      
      // Draw Matrix
      const boxW = 4.2;
      const boxH = 2.2;
      const startX = 0.8;
      const startY = 1.5;

      matrixSlide.addShape(pres.ShapeType.rect, { x: startX, y: startY, w: boxW, h: boxH, fill: { color: 'FF6321', transparency: 80 } });
      matrixSlide.addText("BUZZ", { x: startX, y: startY, w: boxW, h: boxH, align: 'center', fontSize: 24, color: 'FF6321', bold: true });
      
      matrixSlide.addShape(pres.ShapeType.rect, { x: startX + boxW + 0.2, y: startY, w: boxW, h: boxH, fill: { color: '00FF00', transparency: 80 } });
      matrixSlide.addText("EMERGENT", { x: startX + boxW + 0.2, y: startY, w: boxW, h: boxH, align: 'center', fontSize: 24, color: '00FF00', bold: true });
      
      matrixSlide.addShape(pres.ShapeType.rect, { x: startX, y: startY + boxH + 0.2, w: boxW, h: boxH, fill: { color: '8B4513', transparency: 80 } });
      matrixSlide.addText("MAINSTREAM", { x: startX, y: startY + boxH + 0.2, w: boxW, h: boxH, align: 'center', fontSize: 24, color: '8B4513', bold: true });
      
      matrixSlide.addShape(pres.ShapeType.rect, { x: startX + boxW + 0.2, y: startY + boxH + 0.2, w: boxW, h: boxH, fill: { color: 'FFD700', transparency: 80 } });
      matrixSlide.addText("NICHE", { x: startX + boxW + 0.2, y: startY + boxH + 0.2, w: boxW, h: boxH, align: 'center', fontSize: 24, color: 'FFD700', bold: true });

      // 5. Individual Trend Slides
      for (const trend of trends) {
        const insight = newInsights[trend.id];
        if (!insight) continue;

        const slide = pres.addSlide();
        
        // Header
        slide.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '100%', h: 1.2, fill: { color: '0A192F' } });
        slide.addText(insight.title.toUpperCase(), { x: 0.5, y: 0.3, w: 7, fontSize: 28, color: 'FFFFFF', bold: true });
        slide.addText(`${insight.quadrant} Trend | Score: ${insight.score}`, { x: 0.5, y: 0.8, fontSize: 14, color: 'FF6321', bold: true });

        // Key Insight
        slide.addText("KEY INSIGHT", { x: 0.5, y: 1.5, fontSize: 14, color: '0A192F', bold: true });
        slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 1.8, w: 9, h: 0.8, fill: { color: 'F0F4F8' }, line: { color: '0A192F', width: 1 } });
        slide.addText(insight.keyInsight, { x: 0.7, y: 1.8, w: 8.6, h: 0.8, fontSize: 16, color: '0A192F', italic: true, valign: 'middle' });

        // Implication
        slide.addText("IMPLICATION", { x: 0.5, y: 2.8, fontSize: 14, color: 'FF6321', bold: true });
        slide.addText(insight.implication, { x: 0.5, y: 3.1, w: 9, fontSize: 12, color: '333333' });

        // Narrative
        slide.addText("THE NARRATIVE", { x: 0.5, y: 4.0, fontSize: 14, color: '0A192F', bold: true });
        slide.addText(insight.narrative, { x: 0.5, y: 4.3, w: 9, h: 2.5, fontSize: 11, color: '666666', lineSpacing: 18 });

        // Context Boxes
        slide.addShape(pres.ShapeType.rect, { x: 0.5, y: 7.0, w: 4.4, h: 1.2, fill: { color: '0A192F', transparency: 95 } });
        slide.addText("CATEGORY CONTEXT", { x: 0.6, y: 7.1, fontSize: 10, color: '0A192F', bold: true });
        slide.addText(insight.categoryContext, { x: 0.6, y: 7.3, w: 4.2, fontSize: 9, color: '333333' });

        slide.addShape(pres.ShapeType.rect, { x: 5.1, y: 7.0, w: 4.4, h: 1.2, fill: { color: 'FF6321', transparency: 95 } });
        slide.addText("MACRO CONTEXT", { x: 5.2, y: 7.1, fontSize: 10, color: 'FFFFFF', bold: true });
        slide.addText(insight.macroContext, { x: 5.2, y: 7.3, w: 4.2, fontSize: 9, color: 'FFFFFF' });

        // Footer
        slide.addText(`Source: ${insight.sourceCitation}`, { x: 0.5, y: 8.3, fontSize: 8, color: '999999', italic: true });
      }

      // 6. Examples Slide (Summary of examples if needed, or just end)
      const endSlide = pres.addSlide();
      endSlide.background = { color: '0A192F' };
      endSlide.addText("THANK YOU", { x: 0, y: 3.0, w: '100%', align: 'center', fontSize: 48, color: 'FFFFFF', bold: true });
      endSlide.addText("Strategic Foresight by Brandscapes Worldwide", { x: 0, y: 4.0, w: '100%', align: 'center', fontSize: 18, color: 'FF6321' });

      await pres.writeFile({ fileName: `TrendWeaver_${topic.replace(/\s+/g, '_')}_Full_Report.pptx` });
    } catch (err) {
      console.error(err);
      setError('Failed to generate full PPTX report.');
    } finally {
      setIsGeneratingPPTX(false);
      setLoadingTrendId(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-brand-light dark:bg-[#0d1117] transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-brand-blue dark:bg-[#161b22] text-white py-6 px-8 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-4">
          <img src="/trendweaverLogo.gif" alt="TrendWeaver Logo" className="w-12 h-12 rounded-lg object-contain" />
          <div>
            <h1 className="text-2xl font-display font-bold tracking-tight">TRENDWEAVER</h1>
            <p className="text-xs text-white/60 font-mono uppercase tracking-widest">foresight in motion</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-white/40 text-xs font-mono">
            <span className="px-2 py-1 border border-white/10 rounded">v1.0.0</span>
            <span className="px-2 py-1 border border-white/10 rounded">AI-POWERED</span>
          </div>
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-lg border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title="Toggle theme"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8 space-y-12">
        {/* Hero / Search */}
        <section className="text-center space-y-6 max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h2 className="text-4xl md:text-5xl font-display font-bold text-brand-blue dark:text-white">
              An End-To-End AI-Powered Solution
            </h2>
            <p className="text-lg text-brand-blue/60 dark:text-white/50">
              Market and Category Agnostic Trend Intelligence
            </p>
          </motion.div>

          <form onSubmit={handleStart} className="relative max-w-3xl mx-auto">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Search category or market (e.g. Retail, AI)..."
              className="w-full pl-12 pr-56 py-5 bg-white dark:bg-[#161b22] dark:text-white dark:border-white/10 dark:placeholder-white/30 border-2 border-brand-blue/10 rounded-2xl focus:border-brand-accent focus:ring-0 transition-all text-lg shadow-sm"
              disabled={loading}
            />
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-blue/30 w-5 h-5" />
            <button
              type="submit"
              disabled={loading || !topic.trim()}
              className="absolute right-2 top-2 bottom-2 px-8 bg-[#0A2540] text-white rounded-xl font-medium hover:bg-[#0d2f4f] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Discover Trends'}
            </button>
          </form>
        </section>

        {/* Process Pipeline */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-brand-blue/5 -translate-y-1/2 z-0" />
          
          <ProcessStep 
            icon={<Eye />} 
            title="Eye.ai" 
            subtitle="Discovers Trends" 
            description="Scans open data for signals, curates it and uses clustering algorithms to identify trends"
            active={step === 'eye'}
            completed={['map', 'describe'].includes(step)}
          />
          <ProcessStep 
            icon={<MapIcon />} 
            title="Map.ai" 
            subtitle="Prioritizes Trends" 
            description="Classifies each trend based on the ubiquity of the signals to reveal trends"
            active={step === 'map'}
            completed={['describe'].includes(step)}
          />
          <ProcessStep 
            icon={<FileText />} 
            title="Describe" 
            subtitle="Explains Trends" 
            description="Describes each trend with inspiring examples, both in category and in the wider context"
            active={step === 'describe'}
            completed={false}
          />
        </section>

        {/* Results Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Trends List */}
          <div className="lg:col-span-5 space-y-4">
            <AnimatePresence mode="wait">
              {step !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-display font-bold text-xl flex items-center gap-2 text-brand-blue dark:text-white">
                      <TrendingUp className="w-5 h-5 text-brand-accent" />
                      Identified Signals
                    </h3>
                    {loading && step !== 'describe' && <Loader2 className="w-4 h-4 animate-spin text-brand-blue/40" />}
                  </div>

                  {landscapeSummary && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-brand-blue/5 dark:bg-white/5 rounded-2xl border border-brand-blue/10 dark:border-white/10 space-y-2"
                    >
                      <h4 className="text-[10px] font-mono uppercase tracking-widest text-brand-blue/60 dark:text-white/40 font-bold flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Landscape Context
                      </h4>
                      <p className="text-sm text-brand-blue/80 dark:text-white/70 leading-relaxed italic">
                        "{landscapeSummary}"
                      </p>
                    </motion.div>
                  )}

                  {signals.length === 0 && loading && (
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-24 bg-brand-blue/5 animate-pulse rounded-xl" />
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    {trends.length > 0 && (
                      <TrendMatrix 
                        trends={trends} 
                        selectedId={selectedTrendId || undefined} 
                        onSelect={handleSelectTrend} 
                      />
                    )}
                    
                    {trends.length > 0 ? (
                      trends.map((trend) => (
                        <TrendListItem 
                          key={trend.id} 
                          trend={trend} 
                          isSelected={selectedTrendId === trend.id}
                          isLoading={loadingTrendId === trend.id}
                          onClick={() => handleSelectTrend(trend)}
                        />
                      ))
                    ) : (
                      signals.map((signal) => (
                        <div key={signal.id} className="p-4 bg-white dark:bg-[#161b22] border border-brand-blue/5 dark:border-white/10 rounded-xl shadow-sm opacity-60">
                          <p className="font-bold text-sm dark:text-white">{signal.title}</p>
                          <p className="text-xs text-brand-blue/60 dark:text-white/40 mt-1">{signal.source}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Detailed Insight */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {loadingTrendId && !selectedTrend?.id ? (
                <motion.div
                  key="loading-insight"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center p-12 text-center space-y-6 bg-white dark:bg-[#161b22] rounded-3xl border border-brand-blue/10 dark:border-white/10 shadow-xl"
                >
                  <div className="relative">
                    <div className="w-20 h-20 border-4 border-brand-blue/5 border-t-brand-accent rounded-full animate-spin" />
                    <FileText className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-brand-blue/20 dark:text-white/20" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-display font-bold text-xl dark:text-white">Describing Trend...</h4>
                    <p className="text-brand-blue/50 dark:text-white/40 max-w-xs mx-auto">
                      Describe.ai is generating a narrative and category context for this signal.
                    </p>
                  </div>
                </motion.div>
              ) : selectedTrend ? (
                <motion.div
                  key={selectedTrend.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white dark:bg-[#161b22] dark:text-white rounded-3xl border border-brand-blue/10 dark:border-white/10 shadow-xl overflow-hidden"
                >
                  <div className="bg-[#0A2540] p-8 text-white">
                    <div className="flex justify-between items-start mb-4">
                      <span className="px-3 py-1 bg-brand-accent text-white text-[10px] font-mono uppercase tracking-widest rounded-full">
                        {selectedTrend.quadrant} Trend
                      </span>
                      <div className="flex gap-2">
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] text-white/40 uppercase font-mono">Trend Score</span>
                          <span className="text-2xl font-display font-bold">{selectedTrend.score}</span>
                        </div>
                      </div>
                    </div>
                    <h3 className="text-3xl font-display font-bold leading-tight mb-2">{selectedTrend.title}</h3>
                    <div className="flex items-center gap-4 text-white/60 text-sm">
                      <span className="flex items-center gap-1 italic">
                        <Globe className="w-3 h-3" /> {selectedTrend.source}
                      </span>
                      {selectedTrend.sourceUrl && (
                        <div className="flex items-center gap-3">
                          <a 
                            href={selectedTrend.sourceUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 hover:text-white transition-colors underline underline-offset-4"
                          >
                            <LinkIcon className="w-3 h-3" /> View Original Source
                          </a>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(selectedTrend.sourceUrl || '');
                              // Simple feedback could be added here
                            }}
                            className="p-1 hover:bg-white/10 rounded transition-colors"
                            title="Copy Source URL"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-8 space-y-8 dark:text-white">
                    {/* Score Breakdown */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-brand-light dark:bg-white/5 rounded-2xl border border-brand-blue/5 dark:border-white/10">
                      <ScoreBar label="Ubiquity" value={selectedTrend.scoreBreakdown.ubiquity} />
                      <ScoreBar label="Impact" value={selectedTrend.scoreBreakdown.impact} />
                      <ScoreBar label="Relevance" value={selectedTrend.scoreBreakdown.relevance} />
                    </section>

                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-brand-blue dark:bg-indigo-900 text-white rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/60 font-bold flex items-center gap-2">
                          <Target className="w-3 h-3" /> Key Insight
                        </h4>
                        <p className="text-lg font-medium leading-relaxed">
                          {selectedTrend.keyInsight}
                        </p>
                      </div>
                      <div className="p-6 bg-white dark:bg-white/5 border-2 border-dashed border-brand-blue/10 dark:border-white/10 rounded-2xl space-y-3">
                        <h4 className="text-[10px] font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold flex items-center gap-2">
                          <TrendingUp className="w-3 h-3" /> Implication
                        </h4>
                        <p className="text-sm text-brand-blue/80 dark:text-white/70 leading-relaxed">
                          {selectedTrend.implication}
                        </p>
                      </div>
                    </section>

                    <section className="space-y-3">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-brand-accent font-bold flex items-center gap-2">
                        <MessageSquare className="w-3 h-3" /> The Narrative
                      </h4>
                      <p className="text-lg leading-relaxed text-brand-blue/80 dark:text-white/80 font-medium">
                        {selectedTrend.narrative}
                      </p>
                    </section>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <section className="space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold flex items-center gap-2">
                          <Layers className="w-3 h-3" /> Category Context
                        </h4>
                        <p className="text-sm leading-relaxed text-brand-blue/70 dark:text-white/60">
                          {selectedTrend.categoryContext}
                        </p>
                      </section>
                      <section className="space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold flex items-center gap-2">
                          <BarChart3 className="w-3 h-3" /> Macro Context
                        </h4>
                        <p className="text-sm leading-relaxed text-brand-blue/70 dark:text-white/60">
                          {selectedTrend.macroContext}
                        </p>
                      </section>
                    </div>

                    <section className="space-y-4 pt-4 border-t border-brand-blue/5">
                      <h4 className="text-xs font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold">Real-World Examples</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {selectedTrend.examples.map((ex, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 bg-brand-light dark:bg-white/5 rounded-xl text-sm text-brand-blue/80 dark:text-white/70">
                            <div className="w-5 h-5 bg-brand-blue text-white rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                              {i + 1}
                            </div>
                            {ex}
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Related Signals & Source Citation */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-brand-blue/5 dark:border-white/10">
                      <section className="space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold flex items-center gap-2">
                          <Target className="w-3 h-3" /> Related Signals
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedTrend.relatedSignals.map((sig, i) => (
                            <span key={i} className="px-2 py-1 bg-brand-blue/5 dark:bg-white/10 text-brand-blue/60 dark:text-white/60 text-[10px] rounded-md border border-brand-blue/5 dark:border-white/10">
                              {sig}
                            </span>
                          ))}
                        </div>
                      </section>
                      <section className="space-y-3">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold flex items-center gap-2">
                          <History className="w-3 h-3" /> Source Citation
                        </h4>
                        <p className="text-[10px] leading-relaxed text-brand-blue/40 dark:text-white/30 italic font-mono">
                          {selectedTrend.sourceCitation}
                        </p>
                      </section>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-3 pt-6 border-t border-brand-blue/5 dark:border-white/10">
                      <button 
                        onClick={handleShare}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-mono text-brand-blue/40 hover:text-brand-blue dark:text-white/40 dark:hover:text-white transition-colors"
                      >
                        {copied ? <Check className="w-3 h-3 text-green-500" /> : <Share2 className="w-3 h-3" />}
                        {copied ? 'Copied!' : 'Share Insight'}
                      </button>
                      <button 
                        onClick={handleDownloadPPTX}
                        disabled={isGeneratingPPTX}
                        className="flex items-center gap-2 px-6 py-2 bg-[#EA4335] text-white rounded-xl text-xs font-bold hover:bg-[#c5352a] transition-all shadow-md disabled:opacity-50"
                      >
                        {isGeneratingPPTX ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-3 h-3" />
                            Full PPTX Report
                          </>
                        )}
                      </button>
                      <button 
                        onClick={handleDownload}
                        className="flex items-center gap-2 px-6 py-2 bg-[#0A2540] text-white rounded-xl text-xs font-bold hover:bg-[#0d2f4f] transition-all shadow-md"
                      >
                        <Download className="w-3 h-3" /> Text Report
                      </button>
                    </div>
                  </div>
                </motion.div>
              ) : step === 'describe' ? (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center space-y-4 bg-brand-blue/5 dark:bg-white/5 rounded-3xl border-2 border-dashed border-brand-blue/10 dark:border-white/10">
                  <div className="w-16 h-16 bg-white dark:bg-white/10 rounded-full flex items-center justify-center shadow-sm">
                    <Info className="w-8 h-8 text-brand-blue/20 dark:text-white/20" />
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-xl dark:text-white">Select a Trend</h4>
                    <p className="text-brand-blue/50 dark:text-white/40 max-w-xs mx-auto">
                      Choose a prioritized trend from the list to generate deep insights and narratives.
                    </p>
                  </div>
                </div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#161b22] border-t border-brand-blue/5 dark:border-white/10 py-8 px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="text-brand-blue font-bold tracking-tighter text-lg">BRANDSCAPES</span>
            <span className="text-brand-accent font-bold tracking-tighter text-lg">WORLDWIDE</span>
            <div className="w-5 h-5 bg-brand-blue rounded-full flex items-center justify-center ml-1">
              <Search className="w-3 h-3 text-white" />
            </div>
          </div>
          <p className="text-xs text-brand-blue/40 dark:text-white/30 font-mono">
            © 2026 TrendWeaver Intelligence Platform. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs font-mono text-brand-blue/60 dark:text-white/40">
            <a href="#" className="hover:text-brand-accent transition-colors">Methodology</a>
            <a href="#" className="hover:text-brand-accent transition-colors">Data Privacy</a>
            <a href="#" className="hover:text-brand-accent transition-colors">API Access</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function TrendMatrix({ trends, selectedId, onSelect }: { 
  trends: PrioritizedTrend[], 
  selectedId?: string, 
  onSelect: (trend: PrioritizedTrend) => void 
}) {
  return (
    <div className="bg-white dark:bg-[#161b22] p-6 rounded-3xl border border-brand-blue/10 dark:border-white/10 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40 font-bold">Trend Prioritization Matrix</h3>
        <div className="flex gap-4 text-[10px] font-mono text-brand-blue/40 dark:text-white/40">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FF6321]" /> Buzz</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#00FF00]" /> Emergent</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#8B4513]" /> Mainstream</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#FFD700]" /> Niche</span>
        </div>
      </div>
      
      <div className="relative px-8 pb-8 pt-4">
        <div className="relative aspect-square w-full border-2 border-brand-blue/5 dark:border-white/10 rounded-xl bg-brand-light/30 dark:bg-white/5">
          {/* Quadrant Labels */}
          <div className="absolute top-4 left-4 text-[10px] font-mono font-bold text-brand-blue/20 dark:text-white/20 uppercase">Niche</div>
          <div className="absolute top-4 right-4 text-[10px] font-mono font-bold text-brand-blue/20 dark:text-white/20 uppercase">Mainstream</div>
          <div className="absolute bottom-4 left-4 text-[10px] font-mono font-bold text-brand-blue/20 dark:text-white/20 uppercase">Emergent</div>
          <div className="absolute bottom-4 right-4 text-[10px] font-mono font-bold text-brand-blue/20 dark:text-white/20 uppercase">Buzz</div>
          
          {/* Grid Lines */}
          <div className="absolute top-1/2 left-0 w-full h-px bg-brand-blue/10 dark:bg-white/10" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-brand-blue/10 dark:bg-white/10" />
          
          {/* Axis Labels */}
          <div className="absolute -left-12 top-1/2 -rotate-90 text-[10px] font-mono text-brand-blue/40 dark:text-white/30 uppercase tracking-widest whitespace-nowrap">Depth of Signals</div>
          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-mono text-brand-blue/40 dark:text-white/30 uppercase tracking-widest whitespace-nowrap">Width of Signals</div>

          {/* Trend Points */}
          {trends.map((trend) => {
            const x = trend.width;
            const y = 100 - trend.depth; // Invert depth for Y axis (High at top)
            const color = {
              Buzz: "#FF6321",
              Emergent: "#00FF00",
              Mainstream: "#8B4513",
              Niche: "#FFD700"
            }[trend.quadrant];

            return (
              <motion.button
                key={trend.id}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileHover={{ scale: 1.5, zIndex: 50 }}
                onClick={() => onSelect(trend)}
                className={`absolute w-4 h-4 rounded-full border-2 border-white shadow-md -translate-x-1/2 -translate-y-1/2 transition-shadow ${
                  selectedId === trend.id ? 'ring-4 ring-brand-accent/30 scale-125 z-40' : 'z-30'
                }`}
                style={{ 
                  left: `${x}%`, 
                  top: `${y}%`,
                  backgroundColor: color
                }}
                title={trend.title}
              />
            );
          })}
        </div>
      </div>
      <div className="flex justify-between text-[10px] font-mono text-brand-blue/30 dark:text-white/20 px-10">
        <span>LOW WIDTH</span>
        <span>HIGH WIDTH</span>
      </div>
    </div>
  );
}

function ProcessStep({ icon, title, subtitle, description, active, completed }: { 
  icon: React.ReactNode, 
  title: string, 
  subtitle: string, 
  description: string,
  active: boolean,
  completed: boolean
}) {
  return (
    <div className={`relative z-10 p-6 rounded-2xl transition-all duration-500 ${active ? 'bg-white dark:bg-[#161b22] shadow-xl scale-105 ring-2 ring-brand-accent/20' : 'bg-transparent'}`}>
      <div className="flex flex-col items-center text-center space-y-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-500 ${
          active ? 'bg-brand-blue dark:bg-brand-accent text-white scale-110 shadow-lg' : 
          completed ? 'bg-brand-blue/10 dark:bg-white/10 text-brand-blue dark:text-white' : 'bg-white dark:bg-white/5 border border-brand-blue/10 dark:border-white/10 text-brand-blue/20 dark:text-white/20'
        }`}>
          {React.cloneElement(icon as React.ReactElement, { className: "w-8 h-8" })}
        </div>
        <div className="space-y-1">
          <h3 className="font-display font-bold text-lg text-[#0A2540] dark:text-white">
            {title}
          </h3>
          <p className={`text-[10px] font-mono uppercase tracking-widest font-bold ${active ? 'text-brand-accent' : 'text-[#0A2540]/40 dark:text-white/40'}`}>
            {subtitle}
          </p>
        </div>
        <p className="text-xs leading-relaxed text-[#0A2540] dark:text-white">
          {description}
        </p>
      </div>
    </div>
  );
}

function ScoreBar({ label, value }: { label: string, value: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-widest text-brand-blue/40 dark:text-white/40">
        <span>{label}</span>
        <span className="font-bold text-brand-blue dark:text-white">{value}%</span>
      </div>
      <div className="h-1.5 bg-brand-blue/5 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-brand-blue"
        />
      </div>
    </div>
  );
}

function TrendListItem({ trend, isSelected, isLoading, onClick }: { 
  trend: PrioritizedTrend, 
  isSelected: boolean,
  isLoading?: boolean,
  onClick: () => void | Promise<void>,
  key?: string | number
}) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      disabled={isLoading}
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group ${
        isSelected 
          ? 'bg-[#0A2540] border-[#0A2540] text-white shadow-lg' 
          : 'bg-white dark:bg-[#161b22] dark:text-white border-brand-blue/5 dark:border-white/10 hover:border-brand-accent/30 shadow-sm'
      } ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
    >
      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${
        isSelected ? 'bg-white/10' : 'bg-brand-blue/5 dark:bg-white/5'
      }`}>
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-brand-accent" />
        ) : (
          <>
            <span className={`text-[10px] font-mono uppercase ${isSelected ? 'text-white/40' : 'text-brand-blue/40 dark:text-white/50'}`}>Score</span>
            <span className="font-display font-bold text-lg leading-none">{trend.score}</span>
          </>
        )}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-bold truncate text-sm">{trend.title}</h4>
          <span className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded ${
            isSelected ? 'bg-white/20 text-white' : 'bg-brand-blue/5 text-brand-blue/60 dark:text-white/70'
          }`}>
            {trend.category}
          </span>
        </div>
        <p className={`text-xs line-clamp-2 leading-snug ${isSelected ? 'text-white/70' : 'text-brand-blue/50 dark:text-white/60'}`}>
          {trend.description}
        </p>
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isSelected ? 'bg-white/10 text-white/60' : 'bg-brand-blue/5 text-brand-blue/40 dark:text-white/60'
          }`}>
            {trend.quadrant}
          </span>
          <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${
            isSelected ? 'bg-brand-accent text-white' : 'bg-brand-accent/10 text-brand-accent'
          }`}>
            {trend.score} Score
          </span>
        </div>
      </div>

      <ChevronRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${
        isSelected ? 'text-white/40' : 'text-brand-blue/20'
      }`} />
    </motion.button>
  );
}
