import React, { useState } from 'react';
import { categoryService } from '../services';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

const CustomFieldsManager = ({ projectId, customFields, onFieldsUpdate }) => {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creating, setCreating] = useState(false);
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'text',
    applies_to: 'property',
    is_required: false,
    default_value: '',
    options: '',
  });

  const fieldTypes = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
    { value: 'select', label: 'Dropdown' },
    { value: 'multiselect', label: 'Multi-Select' },
    { value: 'boolean', label: 'Yes/No' },
    { value: 'textarea', label: 'Long Text' },
  ];

  const appliesTo = [
    { value: 'property', label: 'Property Level' },
    { value: 'project', label: 'Project Level' },
  ];

  const handleCreateField = async () => {
    if (!formData.field_name) {
      toast.error('Field name is required');
      return;
    }

    // Validate options for select/multiselect
    if ((formData.field_type === 'select' || formData.field_type === 'multiselect') && !formData.options) {
      toast.error('Options are required for dropdown fields');
      return;
    }

    try {
      setCreating(true);
      
      // Parse options if it's a select field
      let optionsList = [];
      if (formData.options) {
        optionsList = formData.options.split(',').map(opt => opt.trim()).filter(opt => opt);
      }

      await categoryService.createCustomField({
        project_id: projectId,
        field_name: formData.field_name,
        field_type: formData.field_type,
        applies_to: formData.applies_to,
        is_required: formData.is_required,
        default_value: formData.default_value || null,
        options: optionsList.length > 0 ? optionsList : null,
        is_active: true,
      });

      toast.success('Custom field created successfully');
      setShowCreateDialog(false);
      setFormData({
        field_name: '',
        field_type: 'text',
        applies_to: 'property',
        is_required: false,
        default_value: '',
        options: '',
      });
      
      // Refresh fields list
      if (onFieldsUpdate) {
        onFieldsUpdate();
      }
    } catch (error) {
      console.error('Failed to create custom field:', error);
      toast.error(error.response?.data?.detail || 'Failed to create custom field');
    } finally {
      setCreating(false);
    }
  };

  const renderFieldTypeIcon = (type) => {
    const icons = {
      text: '📝',
      number: '#️⃣',
      date: '📅',
      select: '📋',
      multiselect: '☑️',
      boolean: '✓/✗',
      textarea: '📄',
    };
    return icons[type] || '📝';
  };

  return (
    <Card className="glass-card shadow-xl">
      <CardHeader className="border-b border-ocean-primary/10">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-ocean-primary to-ocean-secondary bg-clip-text text-transparent">
              Custom Fields
            </CardTitle>
            <p className="text-sm text-gray-600 mt-2">
              Add custom fields specific to this project for properties or project-level data.
            </p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-ocean-primary hover:bg-ocean-secondary">
                <Plus className="w-4 h-4 mr-2" />
                Add Custom Field
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Custom Field</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Field Name *</Label>
                  <Input
                    placeholder="e.g., Parking Spaces, Balcony Size"
                    value={formData.field_name}
                    onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Field Type</Label>
                  <Select value={formData.field_type} onValueChange={(val) => setFormData({ ...formData, field_type: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fieldTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {renderFieldTypeIcon(type.value)} {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Applies To</Label>
                  <Select value={formData.applies_to} onValueChange={(val) => setFormData({ ...formData, applies_to: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {appliesTo.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {(formData.field_type === 'select' || formData.field_type === 'multiselect') && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Options (comma-separated) *</Label>
                    <Input
                      placeholder="e.g., Small, Medium, Large"
                      value={formData.options}
                      onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter options separated by commas</p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">Default Value (optional)</Label>
                  <Input
                    placeholder="Default value"
                    value={formData.default_value}
                    onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is-required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                  />
                  <Label htmlFor="is-required" className="text-sm font-medium">
                    Required Field
                  </Label>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateField}
                  disabled={creating || !formData.field_name}
                  className="bg-ocean-primary hover:bg-ocean-secondary"
                >
                  {creating ? 'Creating...' : 'Create Field'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {customFields.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No custom fields yet</h3>
            <p className="text-gray-500 mb-4">
              Add custom fields to capture project-specific information
            </p>
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-ocean-primary hover:bg-ocean-secondary"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add First Custom Field
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {customFields.map((field) => (
              <Card key={field.id} className="border border-gray-200 hover:border-ocean-primary/30 transition">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-1">
                        {renderFieldTypeIcon(field.field_type)}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg">{field.field_name}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Type: {field.field_type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {field.applies_to === 'property' ? 'Property Level' : 'Project Level'}
                          </Badge>
                          {field.is_required && (
                            <Badge variant="destructive" className="text-xs">
                              Required
                            </Badge>
                          )}
                        </div>
                        {field.default_value && (
                          <p className="text-sm text-gray-600 mt-1">
                            Default: {field.default_value}
                          </p>
                        )}
                        {field.options && field.options.length > 0 && (
                          <p className="text-sm text-gray-600 mt-1">
                            Options: {field.options.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge className={field.is_active ? 'bg-green-500' : 'bg-gray-500'}>
                      {field.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomFieldsManager;
