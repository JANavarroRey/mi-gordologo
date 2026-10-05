import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { PlusCircle, TrendingDown, TrendingUp, Scale, Trash2, Calendar, AlertCircle, Sparkles, HeartPulse } from 'lucide-react';
import { storageService } from '@/domain/services/storageService';
import { WeeklyCheckInModal } from '@/ui/components/weekly/WeeklyCheckInModal';
import type { BodyMeasurement } from '@/domain/models/types';

// Clasificación de IMC según la OMS
const getBmiCategory = (bmi: number) => {
  if (bmi < 18.5) {
    return {
      label: 'Bajo peso',
      color: 'text-amber-800 bg-amber-100 border-amber-300',
      description: 'Por debajo del peso recomendado (18,5 - 24,9). Conviene consultar con tu especialista.',
    };
  }
  if (bmi < 25) {
    return {
      label: 'Peso normal',
      color: 'text-emerald-800 bg-emerald-100 border-emerald-300',
      description: '¡Excelente! Estás en el rango de peso saludable según la Organización Mundial de la Salud.',
    };
  }
  if (bmi < 30) {
    return {
      label: 'Sobrepeso',
      color: 'text-amber-900 bg-amber-100 border-amber-300',
      description: 'Sobrepeso moderado. El objetivo con las 1.500 kcal es ir reduciendo grasa para acercarte a <25.',
    };
  }
  return {
    label: 'Obesidad',
    color: 'text-red-900 bg-red-100 border-red-300',
    description: 'Nivel de obesidad. Seguir estrictamente las pautas hospitalarias para cuidar corazón y articulaciones.',
  };
};

export const TrackingPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formWeight, setFormWeight] = useState('');
  const [formFatPercent, setFormFatPercent] = useState('');
  const [formMuscle, setFormMuscle] = useState('');
  const [formWater, setFormWater] = useState('');
  const [formVisceralFat, setFormVisceralFat] = useState('');
  const [formBoneMinerals, setFormBoneMinerals] = useState('');
  const [formMetabolicAge, setFormMetabolicAge] = useState('');
  const [formBasalMetabolism, setFormBasalMetabolism] = useState('');

  const activeUser = storageService.getActiveProfile();
  const weighInDay = storageService.getWeighInDay();
  const weighDayLabel = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][weighInDay];

  const loadData = () => {
    const list = storageService.getMeasurements();
    setMeasurements(list);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMeasurement = (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(formWeight);
    if (isNaN(weightNum) || weightNum <= 0) return;

    const heightM = activeUser.height / 100;
    const bmiCalc = parseFloat((weightNum / (heightM * heightM)).toFixed(1));

    const fatNum = formFatPercent ? parseFloat(formFatPercent) : null;
    const muscleNum = formMuscle ? parseFloat(formMuscle) : null;
    const waterNum = formWater ? parseFloat(formWater) : null;
    const visceralNum = formVisceralFat ? parseFloat(formVisceralFat) : null;
    const boneNum = formBoneMinerals ? parseFloat(formBoneMinerals) : null;
    const metAgeNum = formMetabolicAge ? parseInt(formMetabolicAge, 10) : activeUser.age;
    const basalNum = formBasalMetabolism
      ? parseInt(formBasalMetabolism, 10)
      : Math.round(10 * weightNum + 6.25 * activeUser.height - 5 * activeUser.age);

    storageService.addMeasurement({
      userId: activeUser.id,
      date: formDate,
      weight: weightNum,
      bmi: bmiCalc,
      fatMass: fatNum ? parseFloat(((weightNum * fatNum) / 100).toFixed(1)) : null,
      fatPercent: fatNum,
      freeFatMass: fatNum ? parseFloat((weightNum - (weightNum * fatNum) / 100).toFixed(1)) : null,
      leanMass: null,
      skeletalMuscle: muscleNum,
      totalWater: waterNum ? parseFloat(((weightNum * waterNum) / 100).toFixed(1)) : null,
      waterPercent: waterNum,
      boneMinerals: boneNum,
      proteins: null,
      visceralFat: visceralNum,
      metabolicRate: null,
      metabolicAge: metAgeNum,
      basalMetabolism: basalNum,
    });

    setFormWeight('');
    setFormFatPercent('');
    setFormMuscle('');
    setFormWater('');
    setFormVisceralFat('');
    setFormBoneMinerals('');
    setFormMetabolicAge('');
    setFormBasalMetabolism('');
    setShowAddForm(false);
    setShowAdvanced(false);
    loadData();
    setIsCheckInOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Eliminar este registro de pesaje?')) {
      storageService.deleteMeasurement(id);
      loadData();
    }
  };

  // Cálculos de variación
  const latest = measurements[measurements.length - 1];
  const initial = measurements[0];
  const weightDiff = latest && initial ? parseFloat((latest.weight - initial.weight).toFixed(1)) : 0;
  const fatDiff = latest && initial && latest.fatPercent && initial.fatPercent
    ? parseFloat((latest.fatPercent - initial.fatPercent).toFixed(1))
    : null;

  // Datos formateados para Recharts
  const chartData = measurements.map((m) => ({
    date: m.date.slice(5), // '09-10'
    peso: m.weight,
    grasa: m.fatPercent,
    musculo: m.skeletalMuscle,
  }));

  return (
    <div className="space-y-4">
      {/* Resumen Superior */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white p-5 rounded-3xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-primary-100 uppercase tracking-wider">
              Seguimiento Clínico
            </p>
            <h2 className="text-2xl font-bold font-display mt-0.5">{activeUser.name}</h2>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-white text-primary-700 hover:bg-primary-50 font-bold text-xs shadow-sm transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Nuevo Pesaje</span>
          </button>
        </div>

        {/* Métricas clave en cards transparentes */}
        {latest && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-primary-500/40 text-center">
            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-primary-100 block">Peso Actual</span>
              <span className="text-xl font-bold">{latest.weight} kg</span>
              {weightDiff !== 0 && (
                <span className={`text-[10px] block font-semibold ${weightDiff < 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
                  {weightDiff > 0 ? `+${weightDiff}` : weightDiff} kg
                </span>
              )}
            </div>

            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-primary-100 block">Grasa Corporal</span>
              <span className="text-xl font-bold">{latest.fatPercent ?? '--'}%</span>
              {fatDiff !== null && (
                <span className={`text-[10px] block font-semibold ${fatDiff < 0 ? 'text-emerald-200' : 'text-amber-200'}`}>
                  {fatDiff > 0 ? `+${fatDiff}` : fatDiff}%
                </span>
              )}
            </div>

            <div className="bg-white/10 rounded-2xl p-2.5 backdrop-blur-xs">
              <span className="text-[11px] text-primary-100 block">Músculo</span>
              <span className="text-xl font-bold">{latest.skeletalMuscle ?? '--'} kg</span>
              <span className="text-[10px] text-primary-200 block">Esquelético</span>
            </div>
          </div>
        )}
      </div>

      {/* Formulario Añadir Registro (arriba, antes del IMC) */}
      {showAddForm && (
        <form
          onSubmit={handleAddMeasurement}
          className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-md space-y-3 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <h3 className="font-bold text-sm text-neutral-800 flex items-center">
              <Scale className="w-4 h-4 mr-1.5 text-primary-600" />
              Añadir datos de la báscula
            </h3>
            <span className="text-xs text-neutral-400">Paso a paso</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Fecha</label>
              <input
                type="date"
                required
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Peso (kg) *</label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="Ej: 77.5"
                value={formWeight}
                onChange={(e) => setFormWeight(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-primary-500 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">% Grasa</label>
              <input
                type="number"
                step="0.1"
                placeholder="42.5"
                value={formFatPercent}
                onChange={(e) => setFormFatPercent(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Músculo (kg)</label>
              <input
                type="number"
                step="0.1"
                placeholder="25.2"
                value={formMuscle}
                onChange={(e) => setFormMuscle(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-neutral-200"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-neutral-600 mb-1">% Agua</label>
              <input
                type="number"
                step="0.1"
                placeholder="40.0"
                value={formWater}
                onChange={(e) => setFormWater(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-neutral-200"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900"
          >
            {showAdvanced ? '− Ocultar estudio hospitalario' : '+ Añadir estudio de composición corporal'}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Grasa visceral</label>
                <input
                  type="number"
                  step="1"
                  placeholder="11"
                  value={formVisceralFat}
                  onChange={(e) => setFormVisceralFat(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-neutral-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Minerales óseos (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="2.3"
                  value={formBoneMinerals}
                  onChange={(e) => setFormBoneMinerals(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-neutral-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Edad metabólica</label>
                <input
                  type="number"
                  step="1"
                  placeholder="77"
                  value={formMetabolicAge}
                  onChange={(e) => setFormMetabolicAge(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-neutral-200"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-600 mb-1">Metabolismo basal (kcal)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="1360"
                  value={formBasalMetabolism}
                  onChange={(e) => setFormBasalMetabolism(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-neutral-200"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-600 hover:bg-neutral-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 shadow-sm"
            >
              Guardar Registro
            </button>
          </div>
        </form>
      )}

      {/* Tarjeta de Salud: IMC (debajo de meter peso) */}
      {latest && latest.weight && (
        (() => {
          const heightM = activeUser.height / 100;
          const bmi = latest.bmi || parseFloat((latest.weight / (heightM * heightM)).toFixed(1));
          const category = getBmiCategory(bmi);
          const targetWeightNormo = Math.round(24.9 * heightM * heightM);
          const diffToNormo = Math.round(latest.weight - targetWeightNormo);

          return (
            <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <HeartPulse className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-xs text-neutral-800 uppercase tracking-wider">
                    Índice de Masa Corporal (IMC)
                  </h3>
                </div>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${category.color}`}>
                  {category.label}
                </span>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-extrabold text-neutral-900 font-display">
                  {bmi}
                </span>
                <span className="text-xs text-neutral-500 font-medium">kg/m²</span>
              </div>

              <p className="text-xs text-neutral-600 leading-relaxed">
                {category.description}
                {diffToNormo > 0 && (
                  <span className="block mt-1 font-medium text-emerald-800">
                    💡 Referencia: Con tu estatura de {activeUser.height} cm, un peso de ~{targetWeightNormo} kg se situaría en rango normal (IMC 24,9).
                  </span>
                )}
              </p>
            </div>
          );
        })()
      )}

      {/* Gráfico 1: solo peso (escala en kg) */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-neutral-800 flex items-center">
            <TrendingDown className="w-4 h-4 mr-1.5 text-primary-600" />
            Evolución del peso
          </h3>
          {weightDiff < 0 ? (
            <span className="text-xs text-emerald-800 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
              <TrendingDown className="w-3 h-3 text-emerald-600" />
              <span>−{Math.abs(weightDiff)} kg</span>
            </span>
          ) : weightDiff > 0 ? (
            <span className="text-xs text-amber-800 font-semibold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center space-x-1">
              <TrendingUp className="w-3 h-3 text-amber-600" />
              <span>+{weightDiff} kg</span>
            </span>
          ) : (
            <span className="text-xs text-neutral-600 font-semibold bg-neutral-100 px-2 py-0.5 rounded-md">
              Estable
            </span>
          )}
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis
                domain={[(dataMin: number) => Math.floor(dataMin - 1), (dataMax: number) => Math.ceil(dataMax + 1)]}
                tick={{ fontSize: 11 }}
                stroke="#94a3b8"
                unit=" kg"
                width={48}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
                formatter={(value) => [`${value} kg`, 'Peso']}
              />
              <Line
                type="monotone"
                dataKey="peso"
                name="Peso (kg)"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ r: 5, fill: '#16a34a', stroke: '#ffffff', strokeWidth: 2 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Gráfico 2: composición (% grasa y músculo) con escalas propias */}
      {chartData.some((d) => d.grasa != null || d.musculo != null) && (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-neutral-200">
          <h3 className="font-bold text-sm text-neutral-800 mb-3 flex items-center">
            <TrendingDown className="w-4 h-4 mr-1.5 text-amber-600" />
            Composición corporal
          </h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis
                  yAxisId="pct"
                  domain={[0, (dataMax: number) => Math.max(50, Math.ceil((dataMax || 40) + 5))]}
                  tick={{ fontSize: 10 }}
                  stroke="#f59e0b"
                  unit="%"
                  width={40}
                />
                <YAxis
                  yAxisId="kg"
                  orientation="right"
                  domain={[(dataMin: number) => Math.max(0, Math.floor((dataMin || 20) - 2)), (dataMax: number) => Math.ceil((dataMax || 30) + 2)]}
                  tick={{ fontSize: 10 }}
                  stroke="#0ea5e9"
                  unit=" kg"
                  width={44}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Line
                  yAxisId="pct"
                  type="monotone"
                  dataKey="grasa"
                  name="% Grasa"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
                <Line
                  yAxisId="kg"
                  type="monotone"
                  dataKey="musculo"
                  name="Músculo (kg)"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  connectNulls
                  dot={{ r: 3, fill: '#0ea5e9' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-1 text-[10px] text-neutral-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> % Grasa (eje izq.)</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> Músculo kg (eje der.)</span>
          </div>
        </div>
      )}

      {/* Dictamen Clínico Dinámico del Gordólogo */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">👨‍⚕️</span>
            <div>
              <h4 className="font-bold text-sm text-neutral-900">Parte Semanal de El Gordólogo</h4>
              <p className="text-[11px] text-neutral-500">Basado en tu evolución y el menú 1.500 kcal</p>
            </div>
          </div>
          <button
            onClick={() => setIsCheckInOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 flex items-center space-x-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Hacer Entrevista</span>
          </button>
        </div>

        <div className="bg-neutral-50 rounded-xl p-3 text-xs text-neutral-700 space-y-2 leading-relaxed">
          {latest ? (
            <>
              <p>
                {weightDiff < 0 ? (
                  <>👏 <strong>¡Progreso excelente!</strong> Llevas acumulada una reducción de <strong>{Math.abs(weightDiff)} kg</strong> respecto a tu registro inicial.</>
                ) : weightDiff > 0 ? (
                  <>⚖️ <strong>Variación registrada:</strong> El peso actual es de <strong>{latest.weight} kg</strong> (+{weightDiff} kg desde el inicio). Mantén la regularidad en las 5 tomas del menú sin saltarte ninguna.</>
                ) : (
                  <>🛡️ <strong>Peso firme:</strong> Te encuentras en <strong>{latest.weight} kg</strong>, consolidando tu base metabólica.</>
                )}
              </p>
              <div className="flex items-start space-x-2 pt-1 text-emerald-950 bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-200/60">
                <AlertCircle className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Pauta del protocolo:</strong> Pésate siempre los <strong>{weighDayLabel}s por la mañana en ayunas</strong>, tras orinar y con la misma ropa ligera, para que las cifras sean 100% comparables.
                </span>
              </div>
            </>
          ) : (
            <p>Registra tu primer pesaje pulsando en &quot;Nuevo Pesaje&quot; para que El Gordólogo empiece a analizar tu evolución.</p>
          )}
        </div>
      </div>

      {/* Historial de Mediciones */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
        <h3 className="font-bold text-sm text-neutral-800 mb-3 flex items-center">
          <Calendar className="w-4 h-4 mr-1.5 text-neutral-500" />
          Historial de Visitas y Báscula
        </h3>

        <div className="space-y-2">
          {measurements.map((m, idx) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-3 rounded-xl bg-neutral-50 hover:bg-neutral-100/80 transition-colors"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-neutral-800">{m.date}</span>
                  {idx === 0 && (
                    <span className="text-[10px] bg-neutral-200 text-neutral-700 px-1.5 py-0.5 rounded font-medium">
                      Inicial
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-3 mt-1 text-[11px] text-neutral-500">
                  <span>IMC: <strong>{m.bmi ?? '--'}</strong></span>
                  <span>Grasa: <strong>{m.fatPercent ? `${m.fatPercent}%` : '--'}</strong></span>
                  <span>Músculo: <strong>{m.skeletalMuscle ? `${m.skeletalMuscle}kg` : '--'}</strong></span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-primary-700">{m.weight} kg</span>
                {measurements.length > 1 && idx > 0 && (
                  <button
                    onClick={() => handleDelete(m.id)}
                    title="Eliminar registro"
                    className="p-1 text-neutral-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Entrevista Semanal Interactivo */}
      <WeeklyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        user={activeUser}
        latestMeasurement={latest}
        previousMeasurement={measurements.length >= 2 ? measurements[measurements.length - 2] : undefined}
        onCompleted={loadData}
      />
    </div>
  );
};

export default TrackingPage;
