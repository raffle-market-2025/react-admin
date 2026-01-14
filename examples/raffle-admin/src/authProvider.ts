import type { AuthProvider } from 'react-admin';
import { supabase } from './supabaseClient';

const AUTH_MODE = (import.meta.env.VITE_AUTH_MODE ?? 'supabase').toLowerCase();
const isLocalMode = AUTH_MODE === 'local';

const LOCAL_USERNAME_KEY = 'username';

const localIdentity = {
    id: 'user',
    fullName: 'Jane Doe',
    avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/...', // ваш base64 как был
};

async function supabaseGetIdentity() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    const user = data.user;
    if (!user) throw new Error('not_authenticated');

    return {
        id: user.id,
        fullName: user.email ?? user.id,
    };
}

async function supabaseCheckAuth() {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) throw new Error('not_authenticated');
}

const authProvider: AuthProvider = {
    login: async (params: any) => {
        if (isLocalMode) {
            const u = (params?.username ?? params?.email ?? 'local').toString();
            localStorage.setItem(LOCAL_USERNAME_KEY, u);
            return;
        }

        const emailRaw = params?.email ?? params?.username;
        const password = params?.password;

        const email = (emailRaw ?? '').toString().trim().toLowerCase();
        if (!email || !password) {
            throw new Error('Email and password are required');
        }

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password: password.toString(),
        });

        if (error) {
            // Supabase типично возвращает: "Invalid login credentials"
            // когда нет пользователя/не тот пароль/пользователь создан без пароля.
            throw new Error(error.message);
        }
    },

    logout: async () => {
        if (isLocalMode) {
            localStorage.removeItem(LOCAL_USERNAME_KEY);
            return;
        }
        await supabase.auth.signOut();
    },

    checkError: async (error: any) => {
        if (isLocalMode) return;

        const status = error?.status;
        if (status === 401 || status === 403) {
            throw new Error('unauthorized');
        }
    },

    checkAuth: async () => {
        if (isLocalMode) {
            return localStorage.getItem(LOCAL_USERNAME_KEY)
                ? Promise.resolve()
                : Promise.reject();
        }
        await supabaseCheckAuth();
    },

    getPermissions: async () => {
        // позже подцепим RBAC из Supabase view/RPC
        return [];
    },

    getIdentity: async () => {
        if (isLocalMode) return localIdentity;
        return supabaseGetIdentity();
    },
};

export default authProvider;
