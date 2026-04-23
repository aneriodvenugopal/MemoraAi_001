import React, { useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, CheckCircle, Zap, Info } from 'lucide-react';

const methodData = {
  dxf: { title: 'DXF/DWG File', formats: '.dxf,.dwg' },
  svg: { title: 'SVG File', formats: '.svg' },
  pdf_vector: { title: 'PDF File (Vector)', formats: '.pdf' },
  cv_ocr: { title: 'Image/PDF (AI)', formats: '.pdf,.jpg,.png,.jpeg' },
  manual: { title: 'Manual Drawing', formats: '.svg,.pdf,.jpg,.png' }
};

const FileUploader = ({ selectedMethod, file, setFile, processing, onProcess }) => {
  const fileInputRef = useRef(null);
  const method = methodData[selectedMethod] || {};

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-ocean-primary">Upload {method.title}</CardTitle>
        <p className="text-sm text-gray-600 mt-2">Formats: {method.formats}</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-ocean-primary/30 rounded-lg p-12 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={method.formats}
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {!file ? (
            <div>
              <Upload className="w-16 h-16 text-ocean-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Select File</h3>
              <p className="text-gray-600 mb-4">Formats: {method.formats}</p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                Select File
              </Button>
            </div>
          ) : (
            <div>
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">File Selected</h3>
              <p className="text-gray-600 mb-4">
                <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => setFile(null)} variant="outline">Change</Button>
                <Button
                  onClick={onProcess}
                  disabled={processing}
                  className="bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Process & Detect
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-2">Processing Steps:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Upload securely</li>
                  <li>Detect plot boundaries</li>
                  <li>Extract plot numbers</li>
                  <li>Review & add pricing</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );
};

export default FileUploader;