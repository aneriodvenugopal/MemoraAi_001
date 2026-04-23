import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Building2, Info } from 'lucide-react';

const TenantSubcategories = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
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
              <Building2 className="w-8 h-8 text-blue-600" />
              Tenant Subcategories
            </h1>
            <p className="text-gray-600 mt-1">Your custom property subcategories</p>
          </div>
        </div>

        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg text-gray-900 mb-2">Tenant Subcategories</h3>
                <p className="text-gray-700">
                  Tenant subcategories are managed through the Tenant Categories page.
                  Each tenant category can have multiple subcategories.
                </p>
                <Button
                  className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                  onClick={() => navigate('/settings/tenant-categories')}
                >
                  Go to Tenant Categories
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TenantSubcategories;