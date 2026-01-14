import type { DataProvider } from 'react-admin';
import { supabase } from '../supabaseClient';

function applyListQuery(query: any, params: any) {
    const { pagination, sort, filter } = params;
    const { page, perPage } = pagination;
    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // сортировка
    if (sort?.field) {
        query = query.order(sort.field, { ascending: sort.order === 'ASC' });
    }

    // фильтры (очень базово: eq/ilike)
    if (filter) {
        Object.entries(filter).forEach(([k, v]) => {
            if (v === undefined || v === null || v === '') return;
            if (typeof v === 'string') query = query.ilike(k, `%${v}%`);
            else query = query.eq(k, v as any);
        });
    }

    return query.range(from, to);
}

export function makeSupabaseDataProvider(): DataProvider {
    return {
        getList: async (resource: string, params: any) => {
            let q = supabase.from(resource).select('*', { count: 'exact' });
            q = applyListQuery(q, params);

            const { data, error, count } = await q;
            if (error) throw error;

            return {
                data: (data ?? []) as any[],
                total: count ?? 0,
            };
        },

        getOne: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .select('*')
                .eq('id', params.id)
                .single();

            if (error) throw error;
            return { data: data as any };
        },

        create: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .insert(params.data)
                .select('*')
                .single();

            if (error) throw error;
            return { data: data as any };
        },

        update: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .update(params.data)
                .eq('id', params.id)
                .select('*')
                .single();

            if (error) throw error;
            return { data: data as any };
        },

        delete: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .delete()
                .eq('id', params.id)
                .select('*')
                .single();

            if (error) throw error;
            return { data: data as any };
        },

        // остальное можно добавить по мере необходимости
        getMany: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .select('*')
                .in('id', params.ids);

            if (error) throw error;
            return { data: (data ?? []) as any[] };
        },

        getManyReference: async (resource: string, params: any) => {
            let q = supabase.from(resource).select('*', { count: 'exact' });
            q = q.eq(params.target, params.id);
            q = applyListQuery(q, params);

            const { data, error, count } = await q;
            if (error) throw error;

            return { data: (data ?? []) as any[], total: count ?? 0 };
        },

        updateMany: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .update(params.data)
                .in('id', params.ids)
                .select('id');

            if (error) throw error;
            return { data: (data ?? []).map((r: any) => r.id) };
        },

        deleteMany: async (resource: string, params: any) => {
            const { data, error } = await supabase
                .from(resource)
                .delete()
                .in('id', params.ids)
                .select('id');

            if (error) throw error;
            return { data: (data ?? []).map((r: any) => r.id) };
        },
    };
}
