import React from 'react';
import { AdvancedSettings } from '../types';

interface AdvancedEditorProps {
  settings: AdvancedSettings;
  onChange: (settings: AdvancedSettings) => void;
}

export const AdvancedEditor: React.FC<AdvancedEditorProps> = ({ settings, onChange }) => {
  
  const update = (section: keyof AdvancedSettings, key: string, value: any) => {
    onChange({
      ...settings,
      [section]: {
        ...(settings[section] as any),
        [key]: value
      }
    });
  };

  const Slider = ({ label, value, min = 0, max = 100, step = 1, section, field, format = (v: number) => v.toString() }: any) => {
    const percentage = ((value - min) / (max - min)) * 100;

    return (
      <div className="mb-6 group">
        <div className="flex justify-between mb-2 items-end">
          <label className="text-xs font-bold uppercase tracking-widest text-gray-400 group-hover:text-black transition-colors duration-300">{label}</label>
          <span className="text-xs font-mono font-medium text-gray-500">{format(value)}</span>
        </div>
        
        <div className="relative w-full h-6 flex items-center">
          {/* Custom Track Background */}
          <div className="absolute w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
             {/* Fill */}
             <div 
               className="h-full bg-black/80 group-hover:bg-black transition-colors duration-300 rounded-full" 
               style={{ width: `${percentage}%` }}
             />
          </div>

          {/* Actual Range Input (Invisible but interactive) */}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => update(section, field, parseFloat(e.target.value))}
            className="absolute w-full h-full opacity-0 cursor-pointer z-10"
          />

          {/* Custom Thumb (Visual Only) */}
          <div 
             className="absolute w-4 h-4 bg-white border-2 border-black rounded-full shadow-md pointer-events-none transition-transform duration-100 ease-out group-hover:scale-125"
             style={{ left: `calc(${percentage}% - 8px)` }}
          />
        </div>
      </div>
    );
  };

  const Select = ({ label, options, value, section, field }: any) => (
    <div className="mb-6">
      <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => update(section, field, e.target.value)}
          className="w-full p-3 text-sm bg-white border border-gray-200 rounded-lg appearance-none focus:outline-none focus:border-black font-serif transition-colors cursor-pointer hover:border-gray-400"
        >
          {options.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        {/* Custom Chevron */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 p-6 bg-gray-50/50 rounded-xl mt-4 border border-gray-100">
      
      {/* SECTION 1 */}
      <div>
        <div className="flex items-center space-x-2 mb-6 opacity-50">
           <div className="w-2 h-2 bg-black rounded-full"></div>
           <h3 className="text-xs font-mono font-bold uppercase tracking-widest">Acoustic Signal</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <div>
            <Slider label="F0 Median (Pitch)" value={settings.vocalTract.f0Median} section="vocalTract" field="f0Median" />
            <Slider label="Formant Scaling" value={settings.vocalTract.formantScaling} section="vocalTract" field="formantScaling" />
            <Slider label="Tract Length Sim" value={settings.vocalTract.lengthSimulation} section="vocalTract" field="lengthSimulation" />
          </div>
          <div>
            <Slider label="Vocal Effort" value={settings.glottalSource.vocalEffort} section="glottalSource" field="vocalEffort" />
            <Slider label="Breathiness" value={settings.glottalSource.breathiness} section="glottalSource" field="breathiness" />
            <Slider label="Harmonic-Noise Ratio" value={settings.glottalSource.hnr} section="glottalSource" field="hnr" />
          </div>
        </div>
      </div>

      <hr className="border-gray-200 border-dashed" />

      {/* SECTION 2 */}
      <div>
        <div className="flex items-center space-x-2 mb-6 opacity-50">
           <div className="w-2 h-2 bg-black rounded-full"></div>
           <h3 className="text-xs font-mono font-bold uppercase tracking-widest">Prosody & Rhythm</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <div>
            <Slider label="Speech Rate" value={settings.temporal.speechRate} min={0.5} max={2.0} step={0.1} section="temporal" field="speechRate" format={(v: number) => v.toFixed(1) + 'x'} />
            
             <div className="flex items-center justify-between mb-6 mt-8 p-3 bg-white rounded-lg border border-gray-200">
              <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Macro Pausing</label>
              <button 
                onClick={() => update('temporal', 'macroPausing', !settings.temporal.macroPausing)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${settings.temporal.macroPausing ? 'bg-black' : 'bg-gray-200'}`}
              >
                <span className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 shadow-sm ${settings.temporal.macroPausing ? 'translate-x-6' : ''}`} />
              </button>
            </div>
          </div>
          <div>
            <Select label="Pitch Dynamics" options={['Narrow', 'Normal', 'Wide']} value={settings.intonation.dynamicRange} section="intonation" field="dynamicRange" />
            <Select label="Rhythmic Spacing" options={['Staccato', 'Natural', 'Legato']} value={settings.rhythm.spacing} section="rhythm" field="spacing" />
          </div>
        </div>
      </div>

      <hr className="border-gray-200 border-dashed" />

      {/* SECTION 3 */}
      <div>
         <div className="flex items-center space-x-2 mb-6 opacity-50">
           <div className="w-2 h-2 bg-black rounded-full"></div>
           <h3 className="text-xs font-mono font-bold uppercase tracking-widest">Style & Persona</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
          <div>
             <Slider label="Articulation Precision" value={settings.enunciation.precision} section="enunciation" field="precision" />
             <Slider label="Consonant Force" value={settings.enunciation.consonantForce} section="enunciation" field="consonantForce" />
          </div>
          <div>
             <Slider label="Tension Level" value={settings.state.tension} section="state" field="tension" />
             <Select label="Register" options={['Modal', 'Falsetto', 'Vocal Fry']} value={settings.persona.register} section="persona" field="register" />
          </div>
        </div>
      </div>
    </div>
  );
};