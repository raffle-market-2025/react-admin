/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_PROMO_RAFFLE_SUBGRAPH_URI: string;
}
interface ImportMeta {
    readonly env: ImportMetaEnv;
}
