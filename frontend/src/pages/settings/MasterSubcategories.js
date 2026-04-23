import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Tags, Info } from 'lucide-react';

const MasterSubcategories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 p-6">
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
              <Tags className="w-8 h-8 text-purple-600" />
              Master Subcategories
            </h1>
            <p className="text-gray-600 mt-1">System-wide property subcategories</p>
          </div>
        </div>

        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-fuchsia-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-purple-100">
                <Info className="w-6 h-6 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Master Subcategories</h3>
                <p className="text-gray-700">
                  Master subcategories are managed through the Master Categories page.
                  Each master category can have multiple subcategories.
                </p>
                <Button
                  className="mt-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white"
                  onClick={() => navigate('/settings/master-categories')}
                >
                  Go to Master Categories
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MasterSubcategories;