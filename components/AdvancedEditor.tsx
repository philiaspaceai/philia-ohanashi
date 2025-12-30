import React from 'react';
import { AdvancedSettings } from '../types';

interface AdvancedEditorProps {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
  isRateLocked?: boolean;
}

// STABLE COMPONENT REFERENCES (Defined outside to prevent remounting)
const Slider = ({ label, value, min = 0, max = 100, step = 1, onUpdate, format = (v: number) => v.toString(), disabled = false, badge = null }: any) => {
  return (
    <div className={`mb-8 group transition-opacity ${disabled ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex justify-between mb-3 items-end">
        <div className="flex items-center gap-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 group-hover:text-black transition-colors duration-300">
                {label}
            </label>
            {badge && (
                <span className="text-[8px] font-bold bg-black text-white px-1.5 py-0.5 rounded uppercase tracking-tighter animate-fade-in">
                    {badge}
                </span>
            )}
        </div>
        <span className="text-xs font-mono font-bold text-black bg-gray-100 px-2 py-0.5 rounded">
          {format(value)}
        </span>
      </div>
      
      <div className="relative w-full flex items-center h-6">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onUpdate(parseFloat(e.target.value))}
          className={`w-full h-2 rounded-full appearance-none transition-all touch-none ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-gray-200 cursor-pointer accent-black hover:bg-gray-300'}`}
        />
      </div>
    </div>
  );
};

const Select = ({ label, options, value, onUpdate }: any) => (
  <div className="mb-8">
    <label className="block text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400 mb-2">
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onUpdate(e.target.value)}
        className="w-full p-3 text-xs bg-white border-2 border-gray-100 rounded-xl appearance-none focus:outline-none focus:border-black font-mono transition-all cursor-pointer hover:bg-gray-50"
      >
        {options.map((opt: string) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </div>
    </div>
  </div>
);

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ settings, onChange, isRateLocked = false }) => {
  
  const update = (section: keyof AdvancedSettings, key: string, value: any) => {
    onChange({
      ...settings,
      [section]: {
        ...(settings[section] as any),
        [key]: value
      }
    });
  };

  return (
    <div className="space-y-12 p-6 bg-gray-50/50 rounded-2xl mt-6 border border-gray-100 animate-fade-in">
      
      {/* SECTION 1: ACOUSTIC */}
      <div>
        <div className="flex items-center space-x-3 mb-8">
           <div className="w-1.5 h-1.5 bg-black rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"></div>
           <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-black">Acoustic Core</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <Slider label="Pitch Median" value={settings.vocalTract.f0Median} onUpdate={(v: any) => update("vocalTract", "f0Median", v)} />
            <Slider label="Formant Scale" value={settings.vocalTract.formantScaling} onUpdate={(v: any) => update("vocalTract", "formantScaling", v)} />
            <Slider label="Length Sim" value={settings.vocalTract.lengthSimulation} onUpdate={(v: any) => update("vocalTract", "lengthSimulation", v)} />
          </div>
          <div>
            <Slider label="Vocal Effort" value={settings.glottalSource.vocalEffort} onUpdate={(v: any) => update("glottalSource", "vocalEffort", v)} />
            <Slider label="Breathiness" value={settings.glottalSource.breathiness} onUpdate={(v: any) => update("glottalSource", "breathiness", v)} />
            <Slider label="HNR Ratio" value={settings.glottalSource.hnr} onUpdate={(v: any) => update("glottalSource", "hnr", v)} />
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

      {/* SECTION 2: PROSODY */}
      <div>
        <div className="flex items-center space-x-3 mb-8">
           <div className="w-1.5 h-1.5 bg-black rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"></div>
           <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-black">Prosody & Rhythm</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
            <Slider 
              label="Speech Rate" 
              value={settings.temporal.speechRate} 
              min={0.5} 
              max={2.0} 
              step={0.01} 
              onUpdate={(v: any) => update("temporal", "speechRate", v)}
              format={(v: number) => v.toFixed(2) + 'x'} 
              disabled={isRateLocked}
              badge={isRateLocked ? "Synced" : null}
            />
            
             <div className="flex items-center justify-between mb-8 mt-2 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
              <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Macro Pausing</label>
              <button 
                onClick={() => update('temporal', 'macroPausing', !settings.temporal.macroPausing)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${settings.temporal.macroPausing ? 'bg-black shadow-lg shadow-black/20' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${settings.temporal.macroPausing ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
          <div>
            <Select label="Dynamic Range" options={['Narrow', 'Normal', 'Wide']} value={settings.intonation.dynamicRange} onUpdate={(v: any) => update("intonation", "dynamicRange", v)} />
            <Select label="Spacing Type" options={['Staccato', 'Natural', 'Legato']} value={settings.rhythm.spacing} onUpdate={(v: any) => update("rhythm", "spacing", v)} />
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>

      {/* SECTION 3: STYLE */}
      <div>
         <div className="flex items-center space-x-3 mb-8">
           <div className="w-1.5 h-1.5 bg-black rounded-full shadow-[0_0_8px_rgba(0,0,0,0.3)]"></div>
           <h3 className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-black">Articulatory Style</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
          <div>
             <Slider label="Enunciation" value={settings.enunciation.precision} onUpdate={(v: any) => update("enunciation", "precision", v)} />
             <Slider label="Consonant Force" value={settings.enunciation.consonantForce} onUpdate={(v: any) => update("enunciation", "consonantForce", v)} />
          </div>
          <div>
             <Slider label="Somatic Tension" value={settings.state.tension} onUpdate={(v: any) => update("state", "tension", v)} />
             <Select label="Vocal Register" options={['Modal', 'Falsetto', 'Vocal Fry']} value={settings.persona.register} onUpdate={(v: any) => update("persona", "register", v)} />
          </div>
        </div>
      </div>
    </div>
  );
};