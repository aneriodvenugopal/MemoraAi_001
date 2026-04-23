import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Upload, Save, ArrowLeft, FileText, Image as ImageIcon, Wand2, Hand,
  CheckCircle, AlertCircle, Info, Zap, Target, Edit2, Trash2, Check, X
} from 'lucide-react';
import { toast } from 'sonner';
import { layoutService } from '../services';
import MethodSelector from './HybridLayoutCreator/MethodSelector';
import FileUploader from './HybridLayoutCreator/FileUploader';
import PlotReviewer from './HybridLayoutCreator/PlotReviewer';

const HybridLayoutCreator = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [layoutName, setLayoutName] = useState('');
  const [layoutType, setLayoutType] = useState('venture');
  const [file, setFile] = useState(null);
  const [svgFileInfo, setSvgFileInfo] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [detectedPlots, setDetectedPlots] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleProceed = () => {
    if (!layoutName.trim()) {
      toast.error('Please enter layout name');
      return;
    }
    
    if (selectedMethod === 'manual') {
      navigate('/layouts/create-manual', {
        state: { layoutName, layoutType }
      });
      return;
    }
    
    setStep(2);
  };

  const handleProcessFile = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    setProcessing(true);

    try {
      toast.info('📤 Uploading file...');
      
      // Determine parse method from selected method
      const parseMethodMap = {
        'dxf': 'dxf',
        'svg': 'svg',
        'pdf_vector': 'pdf',
        'cv_ocr': 'ai_ocr'
      };
      
      const parseMethod = parseMethodMap[selectedMethod] || 'svg';
      
      // Call the new parse-file endpoint
      const parseResult = await layoutService.parseLayoutFile(file, parseMethod);
      
      if (!parseResult.success) {
        throw new Error('Parsing failed');
      }
      
      setSvgFileInfo({
        file_id: parseResult.file_id,
        file_url: parseResult.file_url,
        filename: parseResult.filename
      });
      
      // Check if plots were detected
      const detectedPlotsData = parseResult.plots || [];
      
      if (detectedPlotsData.length === 0) {
        toast.warning('⚠️ No plots detected. You can add them manually.');
        setDetectedPlots([]);
        setStep(3);
        return;
      }
      
      // Transform plots to match expected format
      const transformedPlots = detectedPlotsData.map((plot, idx) => ({
        id: plot.id || `plot-${Date.now()}-${idx}`,
        display_name: plot.display_name || `Plot-${idx + 1}`,
        block: plot.block || 'A',
        coordinates: plot.coordinates || [],
        area: plot.area || 0,
        price: null, // User needs to fill this
        status: 'available',
        amenities: [],
        confidence: plot.confidence || 0
      }));
      
      setDetectedPlots(transformedPlots);
      setStep(3);
      
      const avgConfidence = Math.round(
        transformedPlots.reduce((sum, p) => sum + p.confidence, 0) / transformedPlots.length
      );
      
      toast.success(
        `✅ Detected ${transformedPlots.length} plots! (Confidence: ${avgConfidence}%)`
      );
      
    } catch (error) {
      console.error('File processing error:', error);
      toast.error(error.message || 'Failed to process file. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSaveLayout = async () => {
    const missing = detectedPlots.filter(p => !p.price || p.price <= 0);
    
    if (missing.length > 0) {
      toast.error(`${missing.length} plots missing prices`);
      return;
    }

    setSaving(true);

    try {
      await layoutService.createMasterLayout({
        layout_name: layoutName,
        layout_type: layoutType,
        svg_url: svgFileInfo.file_url,
        plots: detectedPlots.map(p => ({
          ...p,
          price: parseFloat(p.price),
          area: parseFloat(p.area)
        })),
        metadata: {
          detection_method: selectedMethod,
          file_id: svgFileInfo.file_id
        },
        is_template: false
      });
      
      toast.success('✅ Layout saved!');
      setTimeout(() => navigate('/layouts'), 1500);
      
    } catch (error) {
      console.error(error);
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => step === 1 ? navigate('/layouts') : setStep(step - 1)}
              variant="ghost"
              className="text-ocean-primary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {step === 1 ? 'Back' : 'Previous'}
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              Create Layout - Smart Detection
            </h1>
            <div className="w-24"></div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        
        {/* Progress */}
        <div className="mb-8 flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step >= 1 ? 'text-ocean-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-ocean-primary text-white' : 'bg-gray-200'}`}>
              {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
            </div>
            <span className="ml-2">Method</span>
          </div>
          <div className={`w-16 h-1 ${step >= 2 ? 'bg-ocean-primary' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${step >= 2 ? 'text-ocean-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-ocean-primary text-white' : 'bg-gray-200'}`}>
              {step > 2 ? <CheckCircle className="w-5 h-5" /> : '2'}
            </div>
            <span className="ml-2">Upload</span>
          </div>
          <div className={`w-16 h-1 ${step >= 3 ? 'bg-ocean-primary' : 'bg-gray-200'}`}></div>
          <div className={`flex items-center ${step >= 3 ? 'text-ocean-primary' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= 3 ? 'bg-ocean-primary text-white' : 'bg-gray-200'}`}>
              3
            </div>
            <span className="ml-2">Review</span>
          </div>
        </div>

        {step === 1 && (
          <MethodSelector
            layoutName={layoutName}
            setLayoutName={setLayoutName}
            layoutType={layoutType}
            setLayoutType={setLayoutType}
            selectedMethod={selectedMethod}
            setSelectedMethod={setSelectedMethod}
            onProceed={handleProceed}
          />
        )}

        {step === 2 && (
          <FileUploader
            selectedMethod={selectedMethod}
            file={file}
            setFile={setFile}
            processing={processing}
            onProcess={handleProcessFile}
          />
        )}

        {step === 3 && (
          <PlotReviewer
            detectedPlots={detectedPlots}
            setDetectedPlots={setDetectedPlots}
            selectedMethod={selectedMethod}
            saving={saving}
            onSave={handleSaveLayout}
            onBack={() => setStep(2)}
          />
        )}
      </main>
    </div>
  );
};

export default HybridLayoutCreator;
