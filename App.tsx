
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameMode, GeoShape, GameStats, GameSettings, ShapeType, ColoringScheme } from './types';
import { getDifficultyParams, generateUniqueShapes } from './services/gameLogic';
import GeoShapeRenderer from './components/GeoShapeRenderer';
import { GoogleGenAI } from "@google/genai";

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [gameMode, setGameMode] = useState<GameMode>(GameMode.CHALLENGE);
  const [showSettings, setShowSettings] = useState(false);
  const [level, setLevel] = useState(1);
  const [targets, setTargets] = useState<GeoShape[]>([]);
  const [gridShapes, setGridShapes] = useState<GeoShape[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState(0);
  
  const [settings, setSettings] = useState<GameSettings>({
    enabledShapes: Object.values(ShapeType),
    enabledSchemes: Object.values(ColoringScheme)
  });

  const [stats, setStats] = useState<GameStats>({
    score: 0,
    level: 1,
    correctAnswers: 0,
    wrongAnswers: 0,
    totalTime: 0,
    bestCombo: 0
  });
  const [combo, setCombo] = useState(0);
  const [performanceReport, setPerformanceReport] = useState<string>("");

  const timerRef = useRef<number | null>(null);

  const startRound = useCallback(() => {
    const params = getDifficultyParams(level, gameMode);
    const newTargets = generateUniqueShapes(params.memoCount, settings);
    const allShapes = generateUniqueShapes(params.gridCount, settings, newTargets);
    
    setTargets(newTargets);
    setGridShapes(allShapes.sort(() => Math.random() - 0.5));
    setSelectedIds(new Set());
    setTimer(params.viewTime);
    setGameState(GameState.OBSERVATION);
    setShowSettings(false);
  }, [level, gameMode, settings]);

  useEffect(() => {
    if (gameState === GameState.OBSERVATION) {
      timerRef.current = window.setInterval(() => {
        setTimer((prev) => {
          if (prev <= 0.1) {
            if (timerRef.current) clearInterval(timerRef.current);
            setGameState(GameState.RECOGNITION);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  const toggleShape = (shape: ShapeType) => {
    setSettings(prev => {
      const isEnabled = prev.enabledShapes.includes(shape);
      if (isEnabled && prev.enabledShapes.length <= 1) return prev;
      return {
        ...prev,
        enabledShapes: isEnabled 
          ? prev.enabledShapes.filter(s => s !== shape)
          : [...prev.enabledShapes, shape]
      };
    });
  };

  const toggleSchemeGroup = (schemes: ColoringScheme[]) => {
    setSettings(prev => {
      const allIncluded = schemes.every(s => prev.enabledSchemes.includes(s));
      let nextSchemes: ColoringScheme[];
      
      if (allIncluded) {
        nextSchemes = prev.enabledSchemes.filter(s => !schemes.includes(s));
      } else {
        nextSchemes = Array.from(new Set([...prev.enabledSchemes, ...schemes]));
      }

      if (nextSchemes.length === 0) return prev;
      return { ...prev, enabledSchemes: nextSchemes };
    });
  };

  const handleShapeClick = (shapeId: string) => {
    if (gameState !== GameState.RECOGNITION) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(shapeId)) next.delete(shapeId);
      else next.add(shapeId);
      return next;
    });
  };

  const submitSelections = () => {
    const targetIds = new Set(targets.map(t => t.id));
    let roundCorrect = 0;
    let roundWrong = 0;

    selectedIds.forEach(id => {
      if (targetIds.has(id)) roundCorrect++;
      else roundWrong++;
    });

    const missed = targets.length - roundCorrect;
    const roundScore = (roundCorrect * 10) - (roundWrong * 5) - (missed * 2);

    setStats(prev => ({
      ...prev,
      score: Math.max(0, prev.score + roundScore),
      correctAnswers: prev.correctAnswers + roundCorrect,
      wrongAnswers: prev.wrongAnswers + roundWrong,
      bestCombo: Math.max(prev.bestCombo, combo + roundCorrect)
    }));

    if (roundCorrect === targets.length && roundWrong === 0) setCombo(prev => prev + 1);
    else setCombo(0);

    setGameState(GameState.FEEDBACK);
  };

  const nextLevel = () => {
    setLevel(prev => prev + 1);
    startRound();
  };

  const resetGame = () => {
    setLevel(1);
    setStats({
      score: 0, level: 1, correctAnswers: 0, wrongAnswers: 0, totalTime: 0, bestCombo: 0
    });
    setCombo(0);
    setPerformanceReport("");
    setGameState(GameState.MENU);
  };

  const generateReportWithGemini = async () => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Analise os seguintes dados de um jogo de memória cognitiva e forneça um breve feedback motivacional em português: Score: ${stats.score}, Nível: ${level}, Acertos: ${stats.correctAnswers}, Erros: ${stats.wrongAnswers}.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
      setPerformanceReport(response.text || "Ótimo esforço!");
    } catch (error) {
      setPerformanceReport("Você teve um desempenho notável!");
    }
  };

  useEffect(() => {
    if (gameState === GameState.GAME_OVER) generateReportWithGemini();
  }, [gameState]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-4xl bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 shadow-2xl p-6 md:p-10 relative z-10 flex flex-col h-[90vh] md:h-auto overflow-hidden">
        
        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
          <h1 className="text-3xl font-game font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">MEMORE</h1>
          <div className="flex gap-4">
             <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Nível</p>
                <p className="text-xl font-game font-bold text-white">{level}</p>
             </div>
             <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-widest">Pontos</p>
                <p className="text-xl font-game font-bold text-blue-400">{stats.score}</p>
             </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col items-center justify-center relative">
          
          {gameState === GameState.MENU && (
            <div className="text-center space-y-8 max-w-md w-full animate-in fade-in zoom-in duration-500">
              {!showSettings ? (
                <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700">
                  <h2 className="text-2xl font-semibold mb-4 text-slate-100">Pronto para o desafio?</h2>
                  <p className="text-slate-400 mb-6 text-sm">Memorize as formas geométricas e as encontre depois. Treine seu foco e memória visual.</p>
                  
                  <div className="flex flex-col gap-3">
                    <button onClick={() => { setGameMode(GameMode.CHALLENGE); startRound(); }} className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl font-bold transition-all shadow-lg active:scale-95">COMEÇAR</button>
                    <button onClick={() => setShowSettings(true)} className="w-full py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition-all border border-slate-600 active:scale-95 flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      CONFIGURAÇÕES
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-slate-900/80 rounded-2xl border border-slate-600 text-left animate-in slide-in-from-right-10 duration-300">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-blue-400">Personalizar Jogo</h3>
                    <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Formas Geométricas</p>
                      <div className="grid grid-cols-3 gap-3">
                        {Object.values(ShapeType).map(type => (
                          <button 
                            key={type} 
                            onClick={() => toggleShape(type)}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 transition-all ${settings.enabledShapes.includes(type) ? 'bg-blue-600/20 border-blue-500 text-blue-100' : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60'}`}
                          >
                            <GeoShapeRenderer 
                              shape={{ id: `setting-${type}`, type, scheme: ColoringScheme.SOLID, colors: ['currentColor'] }} 
                              size={40} 
                              className="pointer-events-none !bg-transparent !p-0 !border-none" 
                            />
                            <span className="text-[10px] font-bold uppercase">{type}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-widest mb-3">Complexidade de Cores</p>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: 'SIMPLES (1 Cor)', schemes: [ColoringScheme.SOLID] },
                          { label: 'DUAL (2 Cores)', schemes: [ColoringScheme.VERTICAL_HALF, ColoringScheme.HORIZONTAL_HALF] },
                          { label: 'COMPLEXO (4 Cores)', schemes: [ColoringScheme.QUARTERS] }
                        ].map(group => {
                          const isEnabled = group.schemes.every(s => settings.enabledSchemes.includes(s));
                          return (
                            <button 
                              key={group.label}
                              onClick={() => toggleSchemeGroup(group.schemes)}
                              className={`flex justify-between items-center p-3 rounded-lg border transition-all ${isEnabled ? 'bg-cyan-600/20 border-cyan-500 text-cyan-100' : 'bg-slate-800 border-slate-700 text-slate-500 opacity-60'}`}
                            >
                              <span className="text-xs font-bold uppercase">{group.label}</span>
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isEnabled ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600'}`}>
                                {isEnabled && <svg className="w-3 h-3 text-slate-900" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <button onClick={() => setShowSettings(false)} className="w-full mt-8 py-3 bg-blue-600 rounded-xl font-bold active:scale-95 transition-all">SALVAR E VOLTAR</button>
                </div>
              )}
            </div>
          )}

          {gameState === GameState.OBSERVATION && (
            <div className="text-center w-full animate-in fade-in duration-300">
              <h2 className="text-xl text-slate-300 mb-8 uppercase tracking-widest font-game">Memorize estas figuras</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 justify-items-center mb-10">
                {targets.map(shape => <GeoShapeRenderer key={shape.id} shape={shape} size={120} />)}
              </div>
              <div className="relative h-2 w-full max-w-md mx-auto bg-slate-700 rounded-full overflow-hidden">
                <div className="absolute h-full bg-blue-400 transition-all duration-100 linear" style={{ width: `${(timer / getDifficultyParams(level, gameMode).viewTime) * 100}%` }} />
              </div>
              <p className="mt-2 text-slate-400 font-game">{Math.ceil(timer)}s restantes</p>
            </div>
          )}

          {gameState === GameState.RECOGNITION && (
            <div className="w-full animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <h2 className="text-lg text-slate-300 uppercase tracking-widest font-game">Selecione as memorizadas</h2>
                <div className="bg-slate-700/50 px-4 py-2 rounded-lg border border-slate-600 text-sm">
                  <span className="text-blue-400 font-bold">{selectedIds.size}</span> / <span className="text-slate-100 font-bold">{targets.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3 justify-items-center mb-8">
                {gridShapes.map(shape => <GeoShapeRenderer key={shape.id} shape={shape} size={80} isSelected={selectedIds.has(shape.id)} onClick={() => handleShapeClick(shape.id)} />)}
              </div>
              <div className="sticky bottom-0 bg-slate-800/95 py-4 flex justify-center border-t border-slate-700">
                <button onClick={submitSelections} className="px-12 py-3 bg-gradient-to-r from-green-600 to-emerald-500 rounded-xl font-bold active:scale-95">CONFIRMAR</button>
              </div>
            </div>
          )}

          {gameState === GameState.FEEDBACK && (
            <div className="text-center w-full animate-in zoom-in duration-500">
              <h2 className="text-3xl font-game font-bold mb-8">Resultado</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-700">
                  <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4">Gabarito</h3>
                  <div className="grid grid-cols-3 gap-2 justify-items-center">
                    {targets.map(t => <GeoShapeRenderer key={t.id} shape={t} size={70} status={selectedIds.has(t.id) ? 'correct' : 'none'} />)}
                  </div>
                </div>
                <div className="p-6 bg-slate-900/40 rounded-2xl border border-slate-700">
                  <h3 className="text-xs text-slate-500 uppercase tracking-widest mb-4">Suas Escolhas</h3>
                  <div className="grid grid-cols-3 gap-2 justify-items-center">
                    {Array.from(selectedIds).map(id => {
                      const shape = gridShapes.find(s => s.id === id);
                      if (!shape) return null;
                      return <GeoShapeRenderer key={id} shape={shape} size={70} status={targets.some(t => t.id === id) ? 'correct' : 'wrong'} />;
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button onClick={nextLevel} className="px-10 py-4 bg-blue-600 rounded-xl font-bold active:scale-95">PRÓXIMO NÍVEL</button>
                <button onClick={() => setGameState(GameState.GAME_OVER)} className="px-10 py-4 bg-slate-700 rounded-xl font-bold active:scale-95">FINALIZAR</button>
              </div>
            </div>
          )}

          {gameState === GameState.GAME_OVER && (
            <div className="text-center space-y-6 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-8 duration-700">
              <h2 className="text-4xl font-game font-bold">Fim de Jogo</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-6">
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700"><p className="text-[10px] text-slate-500 uppercase">Score</p><p className="text-xl font-bold">{stats.score}</p></div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700"><p className="text-[10px] text-slate-500 uppercase">Nível</p><p className="text-xl font-bold">{level}</p></div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700"><p className="text-[10px] text-slate-500 uppercase">Acertos</p><p className="text-xl font-bold text-green-400">{stats.correctAnswers}</p></div>
                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-700"><p className="text-[10px] text-slate-500 uppercase">Combo</p><p className="text-xl font-bold text-blue-400">{stats.bestCombo}</p></div>
              </div>
              {performanceReport && <div className="p-6 bg-blue-900/20 rounded-2xl border border-blue-500/30 text-blue-100 italic">"{performanceReport}"</div>}
              <button onClick={resetGame} className="w-full sm:w-auto px-16 py-4 bg-blue-600 rounded-xl font-bold active:scale-95">MENU PRINCIPAL</button>
            </div>
          )}

        </div>

        {(gameState === GameState.RECOGNITION || gameState === GameState.OBSERVATION) && (
          <div className="mt-6 pt-4 border-t border-slate-700 flex justify-between items-center text-xs text-slate-500 uppercase font-game font-bold tracking-widest">
            <p>Foco Ativo</p>
            <p>MEMORE v1.1</p>
          </div>
        )}
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #475569; }
      `}</style>
    </div>
  );
};

export default App;
