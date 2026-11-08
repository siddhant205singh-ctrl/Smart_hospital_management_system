import React, { useState, useEffect, useRef } from 'react';
import api, { getMediaUrl } from '../../services/api';
import {
  Camera,
  Upload,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  ShieldAlert,
  Info,
  Check,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

export default function MedicineScannerModal({ isOpen, onClose, onMedicinesSaved, existingMedicines = [] }) {
  // Step: 'ack' (one-time disclaimer) -> 'upload' -> 'processing' -> 'review'
  const [step, setStep] = useState('upload');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Extracted Items State for Review
  const [scanId, setScanId] = useState(null);
  const [extractedItems, setExtractedItems] = useState([]);
  const [selectedItemIdx, setSelectedItemIdx] = useState(0);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Check acknowledgement status on modal open
  useEffect(() => {
    if (isOpen) {
      api.get('/medicines/scan/ack-status')
        .then(res => {
          if (res.data.acknowledged) {
            setHasAcknowledged(true);
            setStep('upload');
          } else {
            setHasAcknowledged(false);
            setStep('ack');
          }
        })
        .catch(() => {
          setHasAcknowledged(true);
          setStep('upload');
        });
      setErrorMessage('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setExtractedItems([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle One-Time Acknowledgement Confirm
  const handleAcknowledge = async () => {
    try {
      await api.post('/medicines/scan/ack');
      setHasAcknowledged(true);
      setStep('upload');
    } catch (err) {
      setHasAcknowledged(true);
      setStep('upload');
    }
  };

  // Client-Side Image Compression & Rotation via Canvas API
  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDim = 1600;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          }, 'image/jpeg', 0.82);
        };
      };
    });
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (files.length + selectedFiles.length > 5) {
      setErrorMessage('You can upload a maximum of 5 images per scan.');
      return;
    }

    setErrorMessage('');
    const compressedList = [];
    const previews = [];

    for (const f of files) {
      const compressed = await compressImage(f);
      compressedList.push(compressed);
      previews.push(URL.createObjectURL(compressed));
    }

    setSelectedFiles(prev => [...prev, ...compressedList]);
    setPreviewUrls(prev => [...prev, ...previews]);
  };

  const removeSelectedFile = (idx) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== idx));
    setPreviewUrls(prev => prev.filter((_, i) => i !== idx));
  };

  // Process Scan with Gemini Multimodal
  const handleStartScan = async () => {
    if (selectedFiles.length === 0) {
      setErrorMessage('Please select or capture at least one medicine image.');
      return;
    }

    setStep('processing');
    setLoading(true);
    setErrorMessage('');
    setScanProgress(25);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('photos', file);
    });

    const progressTimer = setInterval(() => {
      setScanProgress(p => (p < 85 ? p + 15 : p));
    }, 600);

    try {
      const res = await api.post('/medicines/scan', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      clearInterval(progressTimer);
      setScanProgress(100);

      const items = res.data.extractedItems || [];
      if (items.length === 0) {
        throw new Error('No medicine text could be identified. Please ensure the label is clear and retake the photo.');
      }

      // Initialize patient-editable fields
      const formattedItems = items.map(item => ({
        brandName: item.brandName || '',
        genericName: item.genericName || '',
        strength: item.strength || '',
        dosageForm: item.dosageForm || 'tablet',
        dosage: '1 unit',
        frequency: 'Once daily',
        reason: '',
        prescribedBy: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'currently_taking',
        visibility: 'emergency_share',
        manufacturer: item.manufacturer || '',
        batchNumber: item.batchNumber || '',
        expiryDate: item.expiryDate || '',
        confidence: item.confidence || { overall: 0.9, fields: {} },
        photoUrl: res.data.imageUrls?.[0] || ''
      }));

      setScanId(res.data.scanId);
      setExtractedItems(formattedItems);
      setSelectedItemIdx(0);
      setStep('review');
    } catch (err) {
      clearInterval(progressTimer);
      console.error('[Medicine Scan Error]:', err);
      setErrorMessage(err.response?.data?.error || err.message || 'Scan failed. Please retake the photo or enter manually.');
      setStep('upload');
    } finally {
      setLoading(false);
    }
  };

  // Update field of current selected item
  const handleFieldChange = (field, val) => {
    setExtractedItems(prev => {
      const copy = [...prev];
      copy[selectedItemIdx] = { ...copy[selectedItemIdx], [field]: val };
      return copy;
    });
  };

  // Check duplicate against existing profile medicines
  const checkIsDuplicate = (name) => {
    if (!name) return false;
    const lower = name.trim().toLowerCase();
    return existingMedicines.some(m => m.name.toLowerCase() === lower || (m.brandName && m.brandName.toLowerCase() === lower));
  };

  // Confirm and Save to My Medicines
  const handleSaveConfirmed = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await api.post('/medicines/scan/confirm', {
        scanId,
        items: extractedItems
      });

      if (onMedicinesSaved) {
        onMedicinesSaved(res.data.medicines);
      }
      onClose();
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to save confirmed medicines.');
    } finally {
      setLoading(false);
    }
  };

  const currentItem = extractedItems[selectedItemIdx] || {};
  const isDuplicate = checkIsDuplicate(currentItem.brandName || currentItem.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black">AI Medicine Scanner</h3>
              <p className="text-[11px] text-teal-100">Scan medicine strip, bottle, box, or prescription slip</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-start space-x-2 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STEP 1: ONE-TIME ACKNOWLEDGEMENT */}
          {step === 'ack' && (
            <div className="text-center py-6 px-4 space-y-5">
              <div className="w-16 h-16 rounded-3xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto shadow-inner">
                <ShieldCheck className="w-9 h-9" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-lg font-black text-slate-900 dark:text-white">AI Medicine Scanner Acknowledgement</h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your photo will be processed by AI assistive software to read the printed medicine name and details.
                  <strong> You will review and confirm all extracted details before anything is saved to your profile.</strong>
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl text-[11px] text-amber-800 dark:text-amber-200 text-left max-w-md mx-auto flex items-start space-x-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>HealthMS identifies and records labels for your personal records only. Never alter prescribed doses without consulting your doctor or pharmacist.</span>
              </div>

              <div className="pt-2 flex justify-center space-x-3">
                <button
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAcknowledge}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition flex items-center space-x-1.5"
                >
                  <span>I Understand & Continue</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: UPLOAD & CAPTURE */}
          {step === 'upload' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Camera Trigger */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-teal-300 dark:border-teal-700 hover:border-teal-500 rounded-3xl bg-teal-50/50 dark:bg-teal-950/20 text-center flex flex-col items-center justify-center space-y-2 group transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Take Photo with Camera</span>
                    <span className="text-[10px] text-slate-500">Supports mobile & webcam capture</span>
                  </div>
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </button>

                {/* Gallery / File Drop */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-3xl bg-slate-50/50 dark:bg-slate-800/40 text-center flex flex-col items-center justify-center space-y-2 group transition"
                >
                  <div className="w-12 h-12 rounded-2xl bg-slate-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">Upload Photos</span>
                    <span className="text-[10px] text-slate-500">JPG, PNG, WEBP (Strip, bottle, box, slip)</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </button>
              </div>

              {/* Thumbnails of selected photos */}
              {previewUrls.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Selected Images ({previewUrls.length}/5):
                  </span>
                  <div className="flex flex-wrap gap-3">
                    {previewUrls.map((url, idx) => (
                      <div key={idx} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm group">
                        <img src={url} alt={`Scan ${idx}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeSelectedFile(idx)}
                          className="absolute top-1 right-1 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:scale-105 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tips & Action */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-400 space-y-1">
                <span className="font-bold text-slate-700 dark:text-slate-300 block">💡 Photography Tips for Accurate AI Reading:</span>
                <p>• Lay blister strip or bottle flat under good lighting without heavy glare.</p>
                <p>• Ensure medicine brand name, strength (e.g. 500mg), and expiry date are in focus.</p>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={selectedFiles.length === 0}
                  onClick={handleStartScan}
                  className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Scan & Extract Details</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PROCESSING STATE */}
          {step === 'processing' && (
            <div className="text-center py-10 px-4 space-y-4">
              <div className="w-16 h-16 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-600 flex items-center justify-center mx-auto animate-pulse">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>
              <h4 className="text-base font-black text-slate-900 dark:text-white">AI Vision Model Reading Medicine Label...</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Extracting brand name, generic salt, strength, dosage form, and packaging parameters with clinical validation.
              </p>
              <div className="w-64 h-2 bg-slate-100 dark:bg-slate-800 rounded-full mx-auto overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full transition-all duration-300"
                  style={{ width: `${scanProgress}%` }}
                />
              </div>
              <button
                type="button"
                onClick={() => setStep('upload')}
                className="text-xs text-slate-400 hover:text-slate-600 underline pt-2"
              >
                Cancel or Retake Photo
              </button>
            </div>
          )}

          {/* STEP 4: REVIEW & CONFIRM (SIDE-BY-SIDE) */}
          {step === 'review' && extractedItems.length > 0 && (
            <div className="space-y-5">
              {/* If multiple medicines detected */}
              {extractedItems.length > 1 && (
                <div className="flex items-center space-x-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                    Detected {extractedItems.length} Medicines:
                  </span>
                  <div className="flex space-x-1">
                    {extractedItems.map((it, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedItemIdx(idx)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                          selectedItemIdx === idx
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        Item #{idx + 1}: {it.brandName || 'Medicine'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Side by side: photo on left, editable form on right */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Left: Photo with Retake Option */}
                <div className="space-y-3">
                  <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 max-h-80 bg-slate-950 flex items-center justify-center">
                    <img
                      src={previewUrls[0] || getMediaUrl(currentItem.photoUrl)}
                      alt="Scanned Packaging"
                      className="max-h-80 w-auto object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Overall AI Confidence: {Math.round((currentItem.confidence?.overall || 0.9) * 100)}%</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setStep('upload')}
                      className="text-teal-600 hover:underline font-bold"
                    >
                      Retake Photo
                    </button>
                  </div>

                  {/* Duplicate Alert Notice */}
                  {isDuplicate && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-800 dark:text-amber-200">
                      <strong>Note:</strong> "{currentItem.brandName}" is already listed in your active medicines. Saving will add this new batch or update your record.
                    </div>
                  )}
                </div>

                {/* Right: Editable Extracted Fields */}
                <div className="space-y-3 text-xs max-h-96 overflow-y-auto pr-1">
                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">
                      Brand Name <span className="text-rose-500">*</span>
                      {currentItem.confidence?.fields?.brandName === 'low' && (
                        <span className="ml-1 text-[10px] text-amber-600 font-normal">(Low confidence - please verify)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={currentItem.brandName}
                      onChange={(e) => handleFieldChange('brandName', e.target.value)}
                      placeholder="e.g. Augmentin, Crocin, Metformin"
                      className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold ${
                        currentItem.confidence?.fields?.brandName === 'low'
                          ? 'border-amber-400 bg-amber-50/50 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'
                      }`}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Generic / Salt Name</label>
                      <input
                        type="text"
                        value={currentItem.genericName}
                        onChange={(e) => handleFieldChange('genericName', e.target.value)}
                        placeholder="e.g. Paracetamol"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Strength</label>
                      <input
                        type="text"
                        value={currentItem.strength}
                        onChange={(e) => handleFieldChange('strength', e.target.value)}
                        placeholder="e.g. 500 mg, 10 ml"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Dosage Form</label>
                      <select
                        value={currentItem.dosageForm}
                        onChange={(e) => handleFieldChange('dosageForm', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      >
                        <option value="tablet">Tablet</option>
                        <option value="capsule">Capsule</option>
                        <option value="syrup">Syrup / Suspension</option>
                        <option value="injection">Injection</option>
                        <option value="ointment">Ointment / Gel</option>
                        <option value="drops">Drops</option>
                        <option value="inhaler">Inhaler</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Status</label>
                      <select
                        value={currentItem.status}
                        onChange={(e) => handleFieldChange('status', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-bold text-teal-700 dark:text-teal-300"
                      >
                        <option value="currently_taking">Currently Taking</option>
                        <option value="as_needed">As Needed (PRN)</option>
                        <option value="stopped">Stopped / Discontinued</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">How you take it (Dose)</label>
                      <input
                        type="text"
                        value={currentItem.dosage}
                        onChange={(e) => handleFieldChange('dosage', e.target.value)}
                        placeholder="e.g. 1 tablet, 5 ml"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Frequency</label>
                      <input
                        type="text"
                        value={currentItem.frequency}
                        onChange={(e) => handleFieldChange('frequency', e.target.value)}
                        placeholder="e.g. Twice daily after food"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Reason / Indication</label>
                    <input
                      type="text"
                      value={currentItem.reason}
                      onChange={(e) => handleFieldChange('reason', e.target.value)}
                      placeholder="e.g. Blood pressure, fever, allergy"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Prescribed By</label>
                      <input
                        type="text"
                        value={currentItem.prescribedBy}
                        onChange={(e) => handleFieldChange('prescribedBy', e.target.value)}
                        placeholder="e.g. Dr. Anita Desai"
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Visibility</label>
                      <select
                        value={currentItem.visibility}
                        onChange={(e) => handleFieldChange('visibility', e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
                      >
                        <option value="emergency_share">Share in Emergencies (Default)</option>
                        <option value="consent_only">Share with Consent Only</option>
                        <option value="private">Private (Only Me)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provenance Badge & Actions */}
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full font-medium">
                  🏷️ Label: Patient-reported. Scanned by AI, confirmed by patient
                </span>
                <div className="flex space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setStep('upload')}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition"
                  >
                    Retake / Re-upload
                  </button>
                  <button
                    type="button"
                    disabled={loading || !currentItem.brandName}
                    onClick={handleSaveConfirmed}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-lg shadow-teal-600/30 transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save to My Medicines'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
