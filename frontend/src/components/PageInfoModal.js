import React, { useState } from 'react';
import { Info, X, CheckCircle2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/**
 * PageInfoModal - Reusable component to show page implementation details
 * 
 * Usage:
 * <PageInfoModal 
 *   title="Project Layout Editor"
 *   features={[...]}
 *   technologies={[...]}
 * />
 */

const PageInfoModal = ({ title, description, features = [], technologies = [], implementations = [] }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating Info Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-ocean-primary to-ocean-secondary hover:from-ocean-primary-dark hover:to-ocean-secondary-dark text-white shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110"
          title="Page Information"
        >
          <Info className="w-6 h-6" />
        </Button>
      </div>

      {/* Info Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden glass-modal">
          <DialogHeader className="border-b border-ocean-primary/20 pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ocean-primary to-ocean-secondary flex items-center justify-center shadow-lg">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
                    {title}
                  </DialogTitle>
                  <p className="text-sm text-gray-600 mt-1">Implementation Details</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOpen(false)}
                className="hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="overflow-y-auto max-h-[60vh] pr-2 custom-scrollbar">
            <div className="space-y-6 py-4">
              
              {/* Description */}
              {description && (
                <div>
                  <h3 className="text-lg font-semibold text-ocean-primary mb-2">📋 Overview</h3>
                  <p className="text-gray-700 leading-relaxed">{description}</p>
                </div>
              )}

              {/* Features */}
              {features.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-ocean-primary mb-3">✨ Key Features</h3>
                  <div className="space-y-2">
                    {features.map((feature, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200 hover:shadow-md transition-shadow">
                        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                        <p className="text-gray-800 text-sm">{feature}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Technologies */}
              {technologies.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-ocean-primary mb-3">🛠️ Technologies Used</h3>
                  <div className="flex flex-wrap gap-2">
                    {technologies.map((tech, index) => (
                      <span
                        key={index}
                        className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-cyan-50 text-ocean-primary text-sm font-medium rounded-full border border-ocean-primary/20 hover:shadow-md transition-shadow"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Implementation Details */}
              {implementations.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-ocean-primary mb-3">🔧 Implementation Details</h3>
                  <div className="space-y-3">
                    {implementations.map((impl, index) => (
                      <div key={index} className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                        <h4 className="font-semibold text-purple-900 mb-2">{impl.title}</h4>
                        <p className="text-gray-700 text-sm leading-relaxed">{impl.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Note */}
              <div className="mt-6 p-4 bg-gradient-to-r from-ocean-primary/5 to-ocean-secondary/5 rounded-lg border border-ocean-primary/20">
                <p className="text-xs text-gray-600 text-center">
                  💡 This information helps you understand what's been built and implemented in this page.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #0891b2 0%, #06b6d4 100%);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #0e7490 0%, #0891b2 100%);
        }
      `}</style>
    </>
  );
};

export default PageInfoModal;
