import { supabase } from '../supabaseClient';

export type RpcResult<T> =
    | { data: T; error?: never }
    | { data?: never; error: Error };

function toError(e: any): Error {
    if (e instanceof Error) return e;
    return new Error(typeof e === 'string' ? e : JSON.stringify(e));
}

export async function rpc<T>(
    fn: string,
    args: Record<string, any>
): Promise<T> {
    const { data, error } = await supabase.rpc(fn, args);
    if (error) throw error;
    return data as T;
}

/** Specific RPC wrapper */
export type CountryRoleItem = {
    country2: string;
    role: 'viewer' | 'operator' | 'admin';
};

export async function setUserCountryRolesBulk(params: {
    userId: string;
    items: CountryRoleItem[];
    replace?: boolean;
}) {
    return rpc<{ country2: string; role: 'viewer' | 'operator' | 'admin' }[]>(
        'set_user_country_roles_bulk',
        {
            _user_id: params.userId,
            _items: params.items,
            _replace: params.replace ?? false,
        }
    );
}
