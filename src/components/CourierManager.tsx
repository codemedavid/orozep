import React, { useState } from 'react';
import { Plus, Edit, Trash2, Save, X, ArrowLeft, Truck, Link } from 'lucide-react';
import { useCouriers, Courier } from '../hooks/useCouriers';

interface CourierManagerProps {
    onBack: () => void;
}

const CourierManager: React.FC<CourierManagerProps> = ({ onBack }) => {
    const { couriers, loading, addCourier, updateCourier, deleteCourier } = useCouriers();
    const [currentView, setCurrentView] = useState<'list' | 'add' | 'edit'>('list');
    const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        tracking_url_template: '',
        is_active: true,
        sort_order: 0
    });

    const handleAddCourier = () => {
        const nextSortOrder = Math.max(...couriers.map(c => c.sort_order), 0) + 1;
        setFormData({
            name: '',
            code: '',
            tracking_url_template: '',
            is_active: true,
            sort_order: nextSortOrder
        });
        setCurrentView('add');
    };

    const handleEditCourier = (courier: Courier) => {
        setEditingCourier(courier);
        setFormData({
            name: courier.name,
            code: courier.code,
            tracking_url_template: courier.tracking_url_template || '',
            is_active: courier.is_active,
            sort_order: courier.sort_order
        });
        setCurrentView('edit');
    };

    const handleDeleteCourier = async (id: string) => {
        if (confirm('Are you sure you want to delete this courier?')) {
            try {
                setIsProcessing(true);
                await deleteCourier(id);
            } catch (error) {
                alert(error instanceof Error ? error.message : 'Failed to delete courier');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const generateCodeFromName = (name: string) => {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .trim();
    };

    const handleNameChange = (name: string) => {
        setFormData({
            ...formData,
            name,
            code: currentView === 'add' ? generateCodeFromName(name) : formData.code
        });
    };

    const handleSaveCourier = async () => {
        if (!formData.name || !formData.code) {
            alert('Please fill in all required fields (Name and Code)');
            return;
        }

        try {
            setIsProcessing(true);
            if (editingCourier) {
                await updateCourier(editingCourier.id, formData);
            } else {
                await addCourier(formData);
            }
            setCurrentView('list');
            setEditingCourier(null);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Failed to save courier');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCancel = () => {
        setCurrentView('list');
        setEditingCourier(null);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white flex items-center justify-center">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-gray-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Loading couriers...</p>
                </div>
            </div>
        );
    }

    // Form View (Add/Edit)
    if (currentView === 'add' || currentView === 'edit') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
                <div className="bg-white shadow-md border-b border-gray-200">
                    <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 py-3 sm:py-0 sm:h-16">
                            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                                <button
                                    onClick={handleCancel}
                                    className="flex items-center space-x-1 sm:space-x-2 text-gray-700 hover:text-emerald-600 transition-colors duration-200"
                                >
                                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                                    <span className="text-sm sm:text-base">Back</span>
                                </button>
                                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                                    {currentView === 'add' ? 'Add Courier' : 'Edit Courier'}
                                </h1>
                            </div>
                            <div className="flex space-x-2 sm:space-x-3 w-full sm:w-auto">
                                <button
                                    onClick={handleCancel}
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors duration-200 flex items-center justify-center space-x-1 sm:space-x-2 text-sm sm:text-base"
                                >
                                    <X className="h-4 w-4" />
                                    <span className="hidden sm:inline">Cancel</span>
                                </button>
                                <button
                                    onClick={handleSaveCourier}
                                    disabled={isProcessing}
                                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-600/90 text-white rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 sm:space-x-2 shadow-lg hover:shadow-xl text-sm sm:text-base disabled:opacity-50"
                                >
                                    <Save className="h-4 w-4" />
                                    <span>{isProcessing ? 'Saving...' : 'Save'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-4 sm:p-6 md:p-8">
                        <div className="space-y-4 sm:space-y-6">
                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Courier Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors text-gray-900"
                                    placeholder="e.g., LBC Express, J&T Express"
                                />
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Courier Code *</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors text-gray-900 disabled:bg-gray-50"
                                    placeholder="lbc-express"
                                    disabled={currentView === 'edit'}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    {currentView === 'edit' ? 'Code cannot be changed after creation' : 'Unique identifier (auto-generated from name)'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">
                                    <Link className="w-4 h-4 inline mr-1" />
                                    Tracking URL Template
                                </label>
                                <input
                                    type="text"
                                    value={formData.tracking_url_template}
                                    onChange={(e) => setFormData({ ...formData, tracking_url_template: e.target.value })}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors text-gray-900"
                                    placeholder="https://tracking.example.com/?tracking_no={tracking}"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Use {'{tracking}'} as placeholder for the tracking number. Leave empty if no tracking URL.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs sm:text-sm font-medium text-gray-900 mb-1.5 sm:mb-2">Sort Order</label>
                                <input
                                    type="number"
                                    value={formData.sort_order}
                                    onChange={(e) => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 transition-colors text-gray-900"
                                    placeholder="0"
                                />
                                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first in the dropdown</p>
                            </div>

                            <div className="flex items-center">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                    />
                                    <span className="text-xs sm:text-sm font-medium text-gray-900">Active Courier</span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // List View
    return (
        <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
            <div className="bg-white shadow-md border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 py-3 sm:py-0 sm:h-16">
                        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
                            <button
                                onClick={onBack}
                                className="flex items-center space-x-1 sm:space-x-2 text-gray-700 hover:text-emerald-600 transition-colors duration-200"
                            >
                                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                                <span className="text-sm sm:text-base">Dashboard</span>
                            </button>
                            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
                                Courier Management
                            </h1>
                        </div>
                        <button
                            onClick={handleAddCourier}
                            className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-600/90 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                        >
                            <Plus className="h-4 w-4" />
                            <span>Add Courier</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4 sm:py-8">
                <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 overflow-hidden">
                    <div className="p-4 sm:p-6">
                        <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                            Couriers / Shipping Providers
                        </h2>

                        {couriers.length === 0 ? (
                            <div className="text-center py-8">
                                <Truck className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-4" />
                                <p className="text-sm sm:text-base text-gray-500 mb-4">No couriers found</p>
                                <button
                                    onClick={handleAddCourier}
                                    className="bg-emerald-600 hover:bg-emerald-600/90 text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                                >
                                    Add First Courier
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-3 sm:space-y-4">
                                {couriers.map((courier) => (
                                    <div
                                        key={courier.id}
                                        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 p-3 sm:p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-200"
                                    >
                                        <div className="flex items-center space-x-3 sm:space-x-4 w-full sm:w-auto">
                                            <div className="p-2 bg-emerald-600/10 rounded-lg">
                                                <Truck className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-sm sm:text-base text-gray-900 mb-1">{courier.name}</h3>
                                                <p className="text-xs sm:text-sm text-gray-500">Code: {courier.code}</p>
                                                {courier.tracking_url_template && (
                                                    <p className="text-xs text-gray-400 truncate">Has tracking URL</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center space-x-2 sm:space-x-3 w-full sm:w-auto justify-end sm:justify-start">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${courier.is_active
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-gray-100 text-gray-600 border border-gray-300'
                                                }`}>
                                                {courier.is_active ? 'Active' : 'Inactive'}
                                            </span>

                                            <button
                                                onClick={() => handleEditCourier(courier)}
                                                className="p-2 text-pink-600 hover:text-pink-700 hover:bg-pink-50 rounded-lg transition-colors duration-200 border border-pink-200"
                                                aria-label="Edit"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </button>

                                            <button
                                                onClick={() => handleDeleteCourier(courier.id)}
                                                disabled={isProcessing}
                                                className="p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 border border-red-300/30 disabled:opacity-50"
                                                aria-label="Delete"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Info Box */}
                <div className="bg-pink-50 rounded-xl p-4 mt-6 border border-pink-100">
                    <h3 className="font-bold text-pink-900 mb-2 flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        How it works
                    </h3>
                    <ul className="text-sm text-pink-800 space-y-1">
                        <li>• Couriers appear in the order shipping dropdown</li>
                        <li>• Inactive couriers won't appear in order management</li>
                        <li>• Tracking URL uses {'{tracking}'} as the tracking number placeholder</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default CourierManager;
