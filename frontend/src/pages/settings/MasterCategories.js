import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Tags } from 'lucide-react';
import MasterCategoryManagement from '../admin/MasterCategoryManagement';

const MasterCategories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Tags className="w-8 h-8 text-indigo-600" />
              Master Categories
            </h1>
            <p className="text-gray-600 mt-1">System-wide property categories</p>
          </div>
        </div>
        <MasterCategoryManagement />
      </div>
    </div>
  );
};

export default MasterCategories;