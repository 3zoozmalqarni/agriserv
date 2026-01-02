import { useState } from 'react';
import { Calculator, Pipette, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '../../shared/PageHeader';

export default function DilutionCalculator() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const [sampleCount, setSampleCount] = useState<string>('');
  const [volumePerSample, setVolumePerSample] = useState<string>('');
  const [calculatedV2, setCalculatedV2] = useState<string>('');

  const [simpleCalc, setSimpleCalc] = useState({
    c1: '',
    v1: '',
    c2: '1',
    v2: '',
    solving: 'v1' as 'c1' | 'v1' | 'c2' | 'v2'
  });

  const [result, setResult] = useState<string>('');

  const [volumeConverter, setVolumeConverter] = useState({
    liters: '',
    milliliters: '',
    microliters: ''
  });

  const [washCalc, setWashCalc] = useState({
    c1: '',
    v1: '',
    c2: '',
    v2: ''
  });

  const [washResult, setWashResult] = useState<string>('');

  const [knownQuantityCalc, setKnownQuantityCalc] = useState({
    knownVolume: '',
    concentration: '',
    targetConcentration: '1',
    sampleCount: '',
    washCount: '',
    washCycles: '',
    volumePerWell: ''
  });

  const [knownQuantityResult, setKnownQuantityResult] = useState<string>('');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const calculateWashDilution = () => {
    const { c1, v1, c2 } = washCalc;

    if (!c1 || !v1 || !c2) {
      setWashResult('يرجى إدخال قيم تركيز مادة الغسيل وحجمها والتركيز النهائي المطلوب');
      return;
    }

    try {
      const c1Num = parseFloat(c1);
      const v1Num = parseFloat(v1);
      const c2Num = parseFloat(c2);

      // Calculate V2 using C1*V1 = C2*V2
      const v2Result = (c1Num * v1Num) / c2Num;
      const waterVolume = v2Result - v1Num;

      setWashResult(
        `الحجم الكلي النهائي = ${v2Result.toFixed(2)} mL\n` +
        `الحجم المطلوب من الماء المقطر = ${waterVolume.toFixed(2)} mL`
      );
    } catch (error) {
      setWashResult('حدث خطأ في الحساب. يرجى التحقق من القيم المدخلة.');
    }
  };

  const resetWashCalculator = () => {
    setWashCalc({ c1: '', v1: '', c2: '', v2: '' });
    setWashResult('');
  };

  const calculateKnownQuantity = () => {
    const { concentration, targetConcentration, sampleCount, washCount, washCycles, volumePerWell } = knownQuantityCalc;

    if (!concentration || !targetConcentration || !sampleCount || !washCount || !washCycles || !volumePerWell) {
      setKnownQuantityResult('يرجى إدخال جميع القيم');
      return;
    }

    try {
      const conc = parseFloat(concentration);
      const targetConc = parseFloat(targetConcentration);
      const samples = parseFloat(sampleCount);
      const washes = parseFloat(washCount);
      const cycles = parseFloat(washCycles);
      const volPerWell = parseFloat(volumePerWell);

      // Calculate total volume needed in µL
      const totalVolumeNeeded = samples * washes * cycles * volPerWell;
      // Convert to mL for wash buffer calculation
      const totalVolumeNeededML = totalVolumeNeeded / 1000;

      // Calculate required wash buffer volume using C1*V1 = C2*V2
      // V1 = (C2 * V2) / C1
      const knownVol = (targetConc * totalVolumeNeededML) / conc;
      const washBufferVolume = totalVolumeNeededML;
      const waterVolume = washBufferVolume - knownVol;

      // Convert to µL for display
      const knownVolUL = knownVol * 1000;
      const waterVolumeUL = waterVolume * 1000;

      setKnownQuantityResult(
        `الكمية المطلوبة من مادة الغسيل المركزة = ${knownVolUL.toFixed(2)} µL\n` +
        `الحجم المطلوب من الماء المقطر = ${waterVolumeUL.toFixed(2)} µL`
      );
    } catch (error) {
      setKnownQuantityResult('حدث خطأ في الحساب. يرجى التحقق من القيم المدخلة.');
    }
  };

  const resetKnownQuantityCalculator = () => {
    setKnownQuantityCalc({ knownVolume: '', concentration: '', targetConcentration: '1', sampleCount: '', washCount: '', washCycles: '', volumePerWell: '' });
    setKnownQuantityResult('');
  };

  const handleVolumeChange = (unit: 'liters' | 'milliliters' | 'microliters', value: string) => {
    if (value === '') {
      setVolumeConverter({ liters: '', milliliters: '', microliters: '' });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    switch (unit) {
      case 'liters':
        setVolumeConverter({
          liters: value,
          milliliters: (numValue * 1000).toString(),
          microliters: (numValue * 1000000).toString()
        });
        break;
      case 'milliliters':
        setVolumeConverter({
          liters: (numValue / 1000).toString(),
          milliliters: value,
          microliters: (numValue * 1000).toString()
        });
        break;
      case 'microliters':
        setVolumeConverter({
          liters: (numValue / 1000000).toString(),
          milliliters: (numValue / 1000).toString(),
          microliters: value
        });
        break;
    }
  };

  const calculateSimpleDilution = () => {
    const { c1, v1, c2, v2, solving } = simpleCalc;

    try {
      switch (solving) {
        case 'v2':
          if (c1 && v1 && c2) {
            const result = (parseFloat(c1) * parseFloat(v1)) / parseFloat(c2);
            setResult(`الحجم النهائي (V2) = ${result.toFixed(2)} µL`);
          }
          break;
        case 'c2':
          if (c1 && v1 && v2) {
            const result = (parseFloat(c1) * parseFloat(v1)) / parseFloat(v2);
            setResult(`التركيز النهائي (C2) = ${result.toFixed(4)}`);
          }
          break;
        case 'v1':
          if (c1 && c2 && v2) {
            const v1Result = (parseFloat(c2) * parseFloat(v2)) / parseFloat(c1);
            const dilutionVolume = parseFloat(v2) - v1Result;
            setResult(`الحجم المطلوب من المادة المركزة = µL ${Math.round(v1Result)}\nالحجم المطلوب من مادة التخفيف = µL ${Math.round(dilutionVolume)}`);
          }
          break;
        case 'c1':
          if (v1 && c2 && v2) {
            const result = (parseFloat(c2) * parseFloat(v2)) / parseFloat(v1);
            setResult(`التركيز الأصلي (C1) = ${result.toFixed(4)}`);
          }
          break;
      }
    } catch (error) {
      setResult('خطأ في الحساب، يرجى التحقق من القيم المدخلة');
    }
  };


  const resetSimpleCalculator = () => {
    setSampleCount('');
    setVolumePerSample('');
    setCalculatedV2('');
    setSimpleCalc({
      c1: '',
      v1: '',
      c2: '1',
      v2: '',
      solving: 'v1'
    });
    setResult('');
  };

  return (
    <div className="min-h-0 bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-2xl border border-white/20 p-8">
          <PageHeader
            icon={Calculator}
            title="حاسبة التخفيفات"
            subtitle="حساب التخفيفات المخبرية بدقة وسهولة"
          />

        <button
          onClick={() => toggleSection('simple')}
          className="w-full flex items-center justify-between gap-2 mb-6 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Pipette className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">حاسبة تخفيف Conjugate</h2>
          </div>
          {expandedSection === 'simple' ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {expandedSection === 'simple' && (
          <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 p-6 bg-gray-50 rounded-lg border-2 border-gray-300">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد العينات
            </label>
            <input
              type="number"
              step="1"
              value={sampleCount}
              onChange={(e) => {
                setSampleCount(e.target.value);
                if (e.target.value && volumePerSample) {
                  const v2 = parseFloat(e.target.value) * parseFloat(volumePerSample);
                  setCalculatedV2(v2.toString());
                  setSimpleCalc({ ...simpleCalc, v2: v2.toString() });
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 10"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الكمية لكل عينة (µL)
            </label>
            <input
              type="number"
              step="any"
              value={volumePerSample}
              onChange={(e) => {
                setVolumePerSample(e.target.value);
                if (sampleCount && e.target.value) {
                  const v2 = parseFloat(sampleCount) * parseFloat(e.target.value);
                  setCalculatedV2(v2.toString());
                  setSimpleCalc({ ...simpleCalc, v2: v2.toString() });
                }
              }}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 1000"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الحجم الإجمالي (µL)
            </label>
            <input
              type="number"
              value={calculatedV2}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-primary-50 font-bold text-primary-900 cursor-not-allowed"
              placeholder="سيتم الحساب تلقائياً"
            />
            <p className="text-xs text-gray-500 mt-1">µL</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              قوة تركيز المادة المستخدمة
            </label>
            <input
              type="number"
              step="any"
              value={simpleCalc.c1}
              onChange={(e) => setSimpleCalc({ ...simpleCalc, c1: e.target.value })}
              disabled={simpleCalc.solving === 'c1'}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69] disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="مثال:25X-20X-10X"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الحجم الأصلي (V1) - مايكروليتر
            </label>
            <input
              type="number"
              step="any"
              value={simpleCalc.v1}
              onChange={(e) => setSimpleCalc({ ...simpleCalc, v1: e.target.value })}
              disabled={simpleCalc.solving === 'v1'}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69] disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="مثال: 5"
            />
            <p className="text-xs text-gray-500 mt-1">µL</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              التركيز النهائي المطلوب
            </label>
            <input
              type="number"
              step="any"
              value={simpleCalc.c2}
              onChange={(e) => setSimpleCalc({ ...simpleCalc, c2: e.target.value })}
              disabled={simpleCalc.solving === 'c2'}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69] disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="مثال: 2"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الحجم النهائي (V2) - مايكروليتر
            </label>
            <input
              type="number"
              step="any"
              value={simpleCalc.v2}
              onChange={(e) => setSimpleCalc({ ...simpleCalc, v2: e.target.value })}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed font-bold"
              placeholder="سيتم حسابه تلقائياً"
            />
            <p className="text-xs text-gray-500 mt-1">µL</p>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={calculateSimpleDilution}
            className="flex-1 bg-primary-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-primary-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            احسب النتيجة
          </button>
          <button
            onClick={resetSimpleCalculator}
            className="px-6 py-4 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            إعادة تعيين
          </button>
        </div>

        {result && (
          <div className="mt-6 p-6 bg-secondary-50 border-2 border-secondary-200 rounded-lg">
            <h3 className="text-lg font-bold text-secondary-900 mb-2">النتيجة:</h3>
            <p className="text-xl font-bold text-secondary-700 whitespace-pre-line">{result}</p>
          </div>
        )}
        </div>
        )}

      {/* Known Quantity Wash Buffer Calculator */}
      <div className="mt-8">
        <button
          onClick={() => toggleSection('knownQuantity')}
          className="w-full flex items-center justify-between gap-2 mb-6 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-secondary-100 p-2 rounded-lg">
              <Pipette className="w-5 h-5 text-secondary-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">حاسبة مادة الغسيل لكمية معلومة</h2>
          </div>
          {expandedSection === 'knownQuantity' ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {expandedSection === 'knownQuantity' && (
          <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Sample Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد العينات
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.sampleCount}
              onChange={(e) => setKnownQuantityCalc({ ...knownQuantityCalc, sampleCount: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 96"
            />
          </div>

          {/* Wash Count */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد الغسلات
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.washCount}
              onChange={(e) => setKnownQuantityCalc({ ...knownQuantityCalc, washCount: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 3"
            />
          </div>

          {/* Wash Cycles */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              عدد مرات الغسيل في الاختبار
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.washCycles}
              onChange={(e) => setKnownQuantityCalc({ ...knownQuantityCalc, washCycles: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 1"
            />
          </div>

          {/* Volume Per Well */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              كمية الغسل لكل فتحة
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.volumePerWell}
              onChange={(e) => setKnownQuantityCalc({ ...knownQuantityCalc, volumePerWell: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 300"
            />
            <p className="text-xs text-gray-500 mt-1">µL</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Known Volume (Auto-calculated) */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الكمية المعلومة من محلول الغسيل النهائي
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.sampleCount && knownQuantityCalc.washCount && knownQuantityCalc.washCycles && knownQuantityCalc.volumePerWell
                ? (parseFloat(knownQuantityCalc.sampleCount) * parseFloat(knownQuantityCalc.washCount) * parseFloat(knownQuantityCalc.washCycles) * parseFloat(knownQuantityCalc.volumePerWell)).toFixed(2)
                : ''}
              readOnly
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
              placeholder="يحسب تلقائياً"
            />
            <p className="text-xs text-gray-500 mt-1">µL</p>
          </div>

          {/* Concentration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              تركيز مادة الغسيل المركزة
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.concentration}
              onChange={(e) => setKnownQuantityCalc({ ...knownQuantityCalc, concentration: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 25X-20X-10X"
            />
          </div>

          {/* Target Concentration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              التركيز النهائي المطلوب
            </label>
            <input
              type="number"
              step="any"
              value={knownQuantityCalc.targetConcentration}
              onChange={(e) => setKnownQuantityCalc({ ...knownQuantityCalc, targetConcentration: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 1X"
            />
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={calculateKnownQuantity}
            className="flex-1 bg-secondary-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-secondary-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            احسب النتيجة
          </button>
          <button
            onClick={resetKnownQuantityCalculator}
            className="px-6 py-4 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            إعادة تعيين
          </button>
        </div>

        {knownQuantityResult && (
          <div className="mt-6 p-6 bg-secondary-50 border-2 border-secondary-200 rounded-lg">
            <h3 className="text-lg font-bold text-secondary-900 mb-2">النتيجة:</h3>
            <p className="text-xl font-bold text-secondary-700 whitespace-pre-line">{knownQuantityResult}</p>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Wash Buffer Dilution Calculator */}
      <div className="mt-8">
        <button
          onClick={() => toggleSection('wash')}
          className="w-full flex items-center justify-between gap-2 mb-6 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-accent-100 p-2 rounded-lg">
              <Pipette className="w-5 h-5 text-accent-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">حاسبة تخفيف مادة الغسيل</h2>
          </div>
          {expandedSection === 'wash' ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {expandedSection === 'wash' && (
          <div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* C1 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              تركيز مادة الغسيل
            </label>
            <input
              type="number"
              step="any"
              value={washCalc.c1}
              onChange={(e) => setWashCalc({ ...washCalc, c1: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 25X-20X-10X"
            />
          </div>

          {/* V1 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              حجم مادة الغسيل المركزة
            </label>
            <input
              type="number"
              step="any"
              value={washCalc.v1}
              onChange={(e) => setWashCalc({ ...washCalc, v1: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 5"
            />
            <p className="text-xs text-gray-500 mt-1">mL</p>
          </div>

          {/* C2 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              التركيز النهائي المطلوب
            </label>
            <input
              type="number"
              step="any"
              value={washCalc.c2}
              onChange={(e) => setWashCalc({ ...washCalc, c2: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="مثال: 25X-20X-10X"
            />
          </div>

          {/* V2 */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              الحجم من الماء المقطر
            </label>
            <input
              type="number"
              step="any"
              value={washCalc.v2}
              onChange={(e) => setWashCalc({ ...washCalc, v2: e.target.value })}
              disabled
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed font-bold"
              placeholder="سيتم حسابه تلقائياً"
            />
            <p className="text-xs text-gray-500 mt-1">mL</p>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={calculateWashDilution}
            className="flex-1 bg-accent-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-accent-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Calculator className="w-5 h-5" />
            احسب النتيجة
          </button>
          <button
            onClick={resetWashCalculator}
            className="px-6 py-4 rounded-lg font-bold bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-200 flex items-center gap-2"
          >
            <RotateCcw className="w-5 h-5" />
            إعادة تعيين
          </button>
        </div>

        {washResult && (
          <div className="mt-6 p-6 bg-accent-50 border-2 border-accent-200 rounded-lg">
            <h3 className="text-lg font-bold text-accent-900 mb-2">النتيجة:</h3>
            <p className="text-xl font-bold text-accent-700 whitespace-pre-line">{washResult}</p>
          </div>
        )}
        </div>
        )}
      </div>

      {/* Volume Converter Section */}
      <div className="mt-8">
        <button
          onClick={() => toggleSection('volume')}
          className="w-full flex items-center justify-between gap-2 mb-6 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="bg-primary-100 p-2 rounded-lg">
              <Calculator className="w-5 h-5 text-primary-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">حاسبة تحويل الأحجام</h2>
          </div>
          {expandedSection === 'volume' ? (
            <ChevronUp className="w-5 h-5 text-gray-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-600" />
          )}
        </button>

        {expandedSection === 'volume' && (
          <div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Liters */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              لتر (L)
            </label>
            <input
              type="number"
              step="any"
              value={volumeConverter.liters}
              onChange={(e) => handleVolumeChange('liters', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="0"
            />
          </div>

          {/* Milliliters */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              ملليلتر (mL)
            </label>
            <input
              type="number"
              step="any"
              value={volumeConverter.milliliters}
              onChange={(e) => handleVolumeChange('milliliters', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="0"
            />
          </div>

          {/* Microliters */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              مايكروليتر (µL)
            </label>
            <input
              type="number"
              step="any"
              value={volumeConverter.microliters}
              onChange={(e) => handleVolumeChange('microliters', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#61bf69] focus:border-[#61bf69]"
              placeholder="0"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-primary-50 border-2 border-primary-200 rounded-lg">
          <p className="text-sm text-primary-800">
            <strong>معلومة:</strong> 1 لتر = 1000 ملليلتر = 1,000,000 مايكروليتر
          </p>
        </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}
