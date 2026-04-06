import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Play,
  Clock,
  Bot,
  BarChart3,
  Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Header from '../../components/common/Header';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { formatCurrency } from '../../utils/helpers';

const CATEGORY_OPTIONS = [
  { value: 'interior', label: 'Interior' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'deep_clean', label: 'Deep Clean' },
  { value: 'maintenance', label: 'Maintenance' },
];

const PRICING_MODEL_OPTIONS = [
  { value: 'hourly_rate', label: 'Hourly Rate' },
  { value: 'fixed_price', label: 'Fixed Price' },
  { value: 'per_robot', label: 'Per Robot' },
];

const CATEGORY_COLORS = {
  interior: 'bg-blue-100 text-blue-800',
  exterior: 'bg-green-100 text-green-800',
  deep_clean: 'bg-orange-100 text-orange-800',
  maintenance: 'bg-purple-100 text-purple-800',
};

const INITIAL_CREATE_FORM = {
  name: '',
  category: 'interior',
  service_type: '',
  pricing_model: 'fixed_price',
  base_price: '',
  estimated_duration_minutes: '',
  robots_required: '',
  description: '',
};

const INITIAL_USE_FORM = {
  customer_id: '',
  scheduled_date: '',
  scheduled_time: '',
};

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(INITIAL_CREATE_FORM);
  const [submitting, setSubmitting] = useState(false);

  // Use template modal
  const [showUseModal, setShowUseModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [useForm, setUseForm] = useState(INITIAL_USE_FORM);
  const [useSubmitting, setUseSubmitting] = useState(false);

  // Shared
  const [customers, setCustomers] = useState([]);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/templates');
      setTemplates(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load templates', err);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const fetchCustomers = useCallback(async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data.data || res.data || []);
    } catch (err) {
      console.error('Failed to load customers', err);
    }
  }, []);

  // Create template
  const openCreateModal = () => {
    setCreateForm(INITIAL_CREATE_FORM);
    setShowCreateModal(true);
  };

  const handleCreateChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/templates', createForm);
      toast.success('Template created successfully');
      setShowCreateModal(false);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to create template', err);
      toast.error(err.response?.data?.message || 'Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  // Use template
  const openUseModal = (template) => {
    setSelectedTemplate(template);
    setUseForm(INITIAL_USE_FORM);
    fetchCustomers();
    setShowUseModal(true);
  };

  const handleUseChange = (field, value) => {
    setUseForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleUseTemplate = async (e) => {
    e.preventDefault();
    if (!selectedTemplate) return;
    setUseSubmitting(true);
    try {
      await api.post(`/templates/${selectedTemplate.id}/use`, useForm);
      toast.success('Job created from template');
      setShowUseModal(false);
    } catch (err) {
      console.error('Failed to use template', err);
      toast.error(err.response?.data?.message || 'Failed to create job from template');
    } finally {
      setUseSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="flex flex-col h-full">
      <Header title="Job Templates" />

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {templates.length} template{templates.length !== 1 ? 's' : ''} available
          </p>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>

        {/* Template Cards Grid */}
        {templates.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Tag size={48} className="mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">No templates yet</p>
            <p className="text-sm">Create your first job template to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col hover:shadow-md transition-shadow"
              >
                {/* Category Badge */}
                <div className="mb-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      CATEGORY_COLORS[template.category] || 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {template.category?.replace('_', ' ') || 'General'}
                  </span>
                </div>

                {/* Name */}
                <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-1">
                  {template.name}
                </h3>

                {/* Service Type */}
                <p className="text-xs text-gray-500 mb-3">{template.service_type}</p>

                {/* Details */}
                <div className="space-y-2 mb-4 flex-1">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Tag size={14} className="text-gray-400 shrink-0" />
                    <span className="capitalize">
                      {template.pricing_model?.replace('_', ' ') || '-'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <BarChart3 size={14} className="text-gray-400 shrink-0" />
                    <span>{formatCurrency(template.base_price)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Clock size={14} className="text-gray-400 shrink-0" />
                    <span>{template.estimated_duration_minutes} mins</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <Bot size={14} className="text-gray-400 shrink-0" />
                    <span>
                      {template.robots_required} robot{template.robots_required !== 1 ? 's' : ''} required
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">
                    Used {template.usage_count || 0} time{(template.usage_count || 0) !== 1 ? 's' : ''}
                  </span>
                  <button
                    onClick={() => openUseModal(template)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Play size={12} />
                    Use Template
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Template"
        size="lg"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={createForm.name}
                onChange={(e) => handleCreateChange('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={createForm.category}
                onChange={(e) => handleCreateChange('category', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Service Type
              </label>
              <input
                type="text"
                value={createForm.service_type}
                onChange={(e) => handleCreateChange('service_type', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Pricing Model */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pricing Model
              </label>
              <select
                value={createForm.pricing_model}
                onChange={(e) => handleCreateChange('pricing_model', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {PRICING_MODEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Price
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={createForm.base_price}
                onChange={(e) => handleCreateChange('base_price', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Estimated Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Duration (minutes)
              </label>
              <input
                type="number"
                min="1"
                value={createForm.estimated_duration_minutes}
                onChange={(e) => handleCreateChange('estimated_duration_minutes', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Robots Required */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Robots Required
              </label>
              <input
                type="number"
                min="1"
                value={createForm.robots_required}
                onChange={(e) => handleCreateChange('robots_required', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={createForm.description}
              onChange={(e) => handleCreateChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Use Template Modal */}
      <Modal
        isOpen={showUseModal}
        onClose={() => setShowUseModal(false)}
        title={`Use Template: ${selectedTemplate?.name || ''}`}
        size="md"
      >
        <form onSubmit={handleUseTemplate} className="space-y-4">
          {/* Customer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer
            </label>
            <select
              value={useForm.customer_id}
              onChange={(e) => handleUseChange('customer_id', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Date
            </label>
            <input
              type="date"
              value={useForm.scheduled_date}
              onChange={(e) => handleUseChange('scheduled_date', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Scheduled Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scheduled Time
            </label>
            <input
              type="time"
              value={useForm.scheduled_time}
              onChange={(e) => handleUseChange('scheduled_time', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setShowUseModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={useSubmitting}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {useSubmitting ? 'Creating Job...' : 'Create Job'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
