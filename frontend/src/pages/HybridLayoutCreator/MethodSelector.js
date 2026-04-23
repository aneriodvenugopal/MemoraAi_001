import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Target, FileText, Wand2, Hand, CheckCircle, Info, ArrowLeft, AlertCircle } from 'lucide-react';

const uploadMethods = [
  {
    id: 'dxf',
    title: 'DXF/DWG File',
    icon: Target,
    color: 'green',
    accuracy: '100%',
    time: '⚡ 2-5 min',
    manual: '5%',
    desc: 'AutoCAD files - Best & Fastest',
    formats: '.dxf,.dwg',
    notes: ['✅ 100% accurate', '✅ Auto detection', '⚡ Very fast'],
    teluguInfo: ['🎯 CAD file నుండి', '⚡ అత్యంత వేగం', '💯 ఖచ్చితత్వం']
  },
  {
    id: 'svg',
    title: 'SVG File',
    icon: FileText,
    color: 'blue',
    accuracy: '95%',
    time: '⚡ 5-10 min',
    manual: '10%',
    desc: 'Vector Graphics - Excellent',
    formats: '.svg',
    notes: ['✅ 95% accurate', '✅ Fast processing'],
    teluguInfo: ['📄 SVG format', '✅ చాలా మంచిది']
  },
  {
    id: 'pdf_vector',
    title: 'PDF (Vector)',
    icon: FileText,
    color: 'purple',
    accuracy: '80%',
    time: '⏱️ 10-20 min',
    manual: '25%',
    desc: 'Vector PDF - Good',
    formats: '.pdf',
    notes: ['✅ 80% accurate', '⚠️ Vector PDFs only'],
    warning: '❌ Scanned PDFs won\'t work',
    teluguInfo: ['📄 Vector PDF మాత్రమే', '⚠️ Scan PDFs కాదు']
  },
  {
    id: 'cv_ocr',
    title: 'Image/PDF (AI)',
    icon: Wand2,
    color: 'orange',
    accuracy: '60-70%',
    time: '⏱️ 30-45 min',
    manual: '40%',
    desc: 'AI-powered for scans',
    formats: '.pdf,.jpg,.png',
    notes: ['🤖 AI detection', '⚠️ Manual correction needed'],
    teluguInfo: ['📷 Scanner images కోసం', '⚠️ Corrections అవసరం']
  },
  {
    id: 'manual',
    title: 'Manual Drawing',
    icon: Hand,
    color: 'gray',
    accuracy: '100%',
    time: '⏱️ 2-3 hrs',
    manual: '100%',
    desc: 'Click to mark boundaries',
    formats: '.svg,.pdf,.jpg,.png',
    notes: ['✅ 100% control', '⏱️ Time consuming'],
    teluguInfo: ['👆 మీరే mark చేయండి', '⏱️ చాలా time']
  }
];

const MethodSelector = ({ layoutName, setLayoutName, layoutType, setLayoutType, selectedMethod, setSelectedMethod, onProceed }) => {
  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-ocean-primary">Layout Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold mb-1 block">Layout Name *</label>
            <Input
              placeholder="e.g., Green Valley Phase 1"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
              className="glass-input"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1 block">Type *</label>
            <select value={layoutType} onChange={(e) => setLayoutType(e.target.value)} className="w-full glass-input">
              <option value="venture">Venture</option>
              <option value="apartment">Apartment</option>
              <option value="open_land">Open Land</option>
              <option value="farm_land">Farm Land</option>
              <option value="other">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-ocean-primary">Choose Upload Method</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {uploadMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            
            return (
              <div
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`relative p-6 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected ? 'border-ocean-primary bg-ocean-primary/5 scale-105' : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg bg-${method.color}-100`}>
                    <Icon className={`w-6 h-6 text-${method.color}-600`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{method.title}</h3>
                    {isSelected && <CheckCircle className="w-5 h-5 text-ocean-primary absolute top-4 right-4" />}
                  </div>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Accuracy:</span>
                    <Badge className={`bg-${method.color}-500`}>{method.accuracy}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{method.time}</span>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-3">{method.desc}</p>

                <details className="mt-3">
                  <summary className="text-sm text-ocean-primary font-medium cursor-pointer">Details</summary>
                  <div className="mt-3 space-y-2 text-xs">
                    <div>
                      <p className="font-semibold mb-1">Features:</p>
                      {method.notes.map((note, i) => (
                        <p key={i} className="text-gray-600">{note}</p>
                      ))}
                    </div>
                    <div className="bg-blue-50 p-2 rounded">
                      <p className="font-semibold text-blue-800 mb-1">తెలుగులో:</p>
                      {method.teluguInfo.map((info, i) => (
                        <p key={i} className="text-blue-700">{info}</p>
                      ))}
                    </div>
                    {method.warning && (
                      <div className="bg-red-50 p-2 rounded">
                        <p className="text-red-700">{method.warning}</p>
                      </div>
                    )}
                  </div>
                </details>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="glass-card bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="font-bold mb-2">Quick Comparison</h3>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-green-700">🏆 DXF</p>
                  <p className="text-gray-600">100%</p>
                </div>
                <div>
                  <p className="font-semibold text-blue-700">⭐ SVG</p>
                  <p className="text-gray-600">95%</p>
                </div>
                <div>
                  <p className="font-semibold text-purple-700">👍 PDF</p>
                  <p className="text-gray-600">80%</p>
                </div>
                <div>
                  <p className="font-semibold text-orange-700">🤖 AI</p>
                  <p className="text-gray-600">60-70%</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={onProceed}
          disabled={!selectedMethod || !layoutName.trim()}
          className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white text-lg px-8 py-6"
        >
          Continue
          <ArrowLeft className="w-5 h-5 ml-2 rotate-180" />
        </Button>
      </div>
    </div>
  );
};

export default MethodSelector;