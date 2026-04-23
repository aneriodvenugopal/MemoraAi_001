import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { layoutService } from '../services';
import InteractiveLayoutViewer from '../components/InteractiveLayoutViewer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Upload, Plus } from 'lucide-react';
import { toast } from 'sonner';

const ProjectLayoutPage = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [layoutData, setLayoutData] = useState(null);
  const [projectData, setProjectData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  
  // Sample layout data for demonstration
  const [sampleLayout, setSampleLayout] = useState({
    layout_name: '',
    plots: []
  });

  useEffect(() => {
    loadLayout();
  }, [projectId]);

  const loadLayout = async () => {
    setLoading(true);
    try {
      const data = await layoutService.getLayout(projectId);
      setLayoutData(data.layout);
      setProjectData(data.project);
    } catch (error) {
      if (error.response?.status === 404) {
        // No layout exists yet
        setLayoutData(null);
      } else {
        toast.error('Failed to load layout');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSampleLayout = async () => {
    // Create a sample layout with demo data
    const demoLayout = {
      layout_name: 'Main Layout',
      plots: [
        {
          id: '1',
          display_name: '1',
          block: 'A',
          coordinates: [
            { x: 1000, y: 1000 },
            { x: 1500, y: 1000 },
            { x: 1500, y: 1500 },
            { x: 1000, y: 1500 }
          ],
          price: 2500000,
          area: 1200,
          status: 'available',
          amenities: ['Water', 'Electricity', 'Road Access']
        },
        {
          id: '2',
          display_name: '2',
          block: 'A',
          coordinates: [
            { x: 1500, y: 1000 },
            { x: 2000, y: 1000 },
            { x: 2000, y: 1500 },
            { x: 1500, y: 1500 }
          ],
          price: 2800000,
          area: 1300,
          status: 'booked',
          amenities: ['Water', 'Electricity', 'Road Access', 'Corner Plot']
        },
        {
          id: '3',
          display_name: '3',
          block: 'A',
          coordinates: [
            { x: 2000, y: 1000 },
            { x: 2500, y: 1000 },
            { x: 2500, y: 1500 },
            { x: 2000, y: 1500 }
          ],
          price: 2600000,
          area: 1250,
          status: 'available',
          amenities: ['Water', 'Electricity', 'Road Access']
        },
        {
          id: '4',
          display_name: '4',
          block: 'B',
          coordinates: [
            { x: 1000, y: 1600 },
            { x: 1500, y: 1600 },
            { x: 1500, y: 2100 },
            { x: 1000, y: 2100 }
          ],
          price: 3200000,
          area: 1400,
          status: 'sold',
          amenities: ['Water', 'Electricity', 'Road Access', 'Garden View']
        },
        {
          id: '5',
          display_name: '5',
          block: 'B',
          coordinates: [
            { x: 1500, y: 1600 },
            { x: 2000, y: 1600 },
            { x: 2000, y: 2100 },
            { x: 1500, y: 2100 }
          ],
          price: 2900000,
          area: 1350,
          status: 'blocked',
          amenities: ['Water', 'Electricity', 'Road Access']
        },
        {
          id: '6',
          display_name: '6',
          block: 'B',
          coordinates: [
            { x: 2000, y: 1600 },
            { x: 2500, y: 1600 },
            { x: 2500, y: 2100 },
            { x: 2000, y: 2100 }
          ],
          price: 2700000,
          area: 1280,
          status: 'available',
          amenities: ['Water', 'Electricity', 'Road Access', 'Wide Road']
        }
      ],
      metadata: {
        version: '1.0',
        created_by: 'demo'
      }
    };

    try {
      await layoutService.createLayout(projectId, demoLayout);
      toast.success('Sample layout created successfully!');
      loadLayout();
      setShowCreateDialog(false);
    } catch (error) {
      toast.error('Failed to create layout');
    }
  };

  const handlePlotClick = (plot) => {
    console.log('Plot clicked:', plot);
    // Handle plot click - could open edit dialog, etc.
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-ocean-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading layout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-ocean-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-ocean-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      {/* Header */}
      <header className="glass-header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={() => navigate('/projects')}
              variant="ghost"
              className="text-ocean-primary hover:bg-ocean-primary/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Projects
            </Button>
            <h1 className="text-xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              Project Layout Manager
            </h1>
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {!layoutData ? (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-ocean-primary">No Layout Created Yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600">
                This project doesn't have a layout yet. You can create one using sample data or upload your own SVG layout.
              </p>
              <div className="flex gap-4">
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:from-ocean-primary-light hover:to-ocean-secondary-light text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Sample Layout
                </Button>
                <Button
                  onClick={() => setShowUploadDialog(true)}
                  variant="outline"
                  className="border-ocean-primary text-ocean-primary hover:bg-ocean-primary/10"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload SVG Layout
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <InteractiveLayoutViewer
            layoutData={layoutData}
            projectData={projectData}
            onPlotClick={handlePlotClick}
            readOnly={false}
          />
        )}
      </main>

      {/* Create Sample Layout Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="text-ocean-primary">Create Sample Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              This will create a sample layout with 6 plots (2 blocks) for demonstration purposes.
              You can edit individual plots after creation.
            </p>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Sample Layout Includes:</p>
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                <li>Block A: 3 plots (1 Available, 1 Booked, 1 Available)</li>
                <li>Block B: 3 plots (1 Sold, 1 Blocked, 1 Available)</li>
                <li>Realistic plot sizes (1200-1400 sq.ft)</li>
                <li>Price range: ₹25L - ₹32L</li>
              </ul>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateSampleLayout}
                className="flex-1 bg-gradient-to-r from-ocean-primary to-ocean-secondary text-white"
              >
                Create Sample Layout
              </Button>
              <Button
                onClick={() => setShowCreateDialog(false)}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Layout Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="glass-modal">
          <DialogHeader>
            <DialogTitle className="text-ocean-primary">Upload SVG Layout</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Upload your SVG layout file and map the plots. (Feature coming soon)
            </p>
            <div className="border-2 border-dashed border-ocean-primary/30 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-ocean-primary/50 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Drag & drop SVG file here or click to browse</p>
            </div>
            <Button
              onClick={() => setShowUploadDialog(false)}
              variant="outline"
              className="w-full"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProjectLayoutPage;
