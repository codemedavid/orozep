import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Courier {
    id: string;
    name: string;
    code: string;
    tracking_url_template: string | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
}

export const useCouriers = () => {
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchCouriers = useCallback(async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('couriers')
                .select('*')
                .order('sort_order', { ascending: true });

            if (error) throw error;
            setCouriers(data || []);
        } catch (error) {
            // No hardcoded fallback list: it resurrected couriers the admin had
            // deleted (LBC), which then got saved onto real orders.
            console.error('Error fetching couriers:', error);
            setCouriers([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const addCourier = async (courier: Omit<Courier, 'id' | 'created_at'>) => {
        try {
            const { data, error } = await supabase
                .from('couriers')
                .insert([courier])
                .select()
                .single();

            if (error) throw error;
            setCouriers(prev => [...prev, data]);
            return data;
        } catch (error) {
            console.error('Error adding courier:', error);
            throw error;
        }
    };

    const updateCourier = async (id: string, updates: Partial<Courier>) => {
        try {
            const { data, error } = await supabase
                .from('couriers')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            setCouriers(prev => prev.map(c => c.id === id ? data : c));
            return data;
        } catch (error) {
            console.error('Error updating courier:', error);
            throw error;
        }
    };

    const deleteCourier = async (id: string) => {
        try {
            const { error } = await supabase
                .from('couriers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setCouriers(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            console.error('Error deleting courier:', error);
            throw error;
        }
    };

    useEffect(() => {
        fetchCouriers();
    }, [fetchCouriers]);

    return {
        couriers,
        loading,
        addCourier,
        updateCourier,
        deleteCourier,
        refetch: fetchCouriers
    };
};
