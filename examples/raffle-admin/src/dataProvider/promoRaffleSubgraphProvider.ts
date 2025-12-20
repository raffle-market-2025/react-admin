import type {
    DataProvider,
    GetListParams,
    GetManyParams,
    GetManyReferenceParams,
    GetOneParams,
} from 'react-admin';
import {
    ApolloClient,
    InMemoryCache,
    createHttpLink,
    gql,
} from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

const DEFAULT_PAGINATION = { page: 1, perPage: 25 } as const;

type Spec = {
    one: string;
    many: string;
    filter: string; // e.g. RaffleEnter_filter
    idVar: string; // e.g. Bytes!
    orderBy: string[]; // whitelist
    select: string; // selection set
};

const raffleEnterSpec: Spec = {
    one: 'raffleEnter',
    many: 'raffleEnters',
    filter: 'RaffleEnter_filter',
    idVar: 'Bytes!',
    orderBy: [
        'blockTimestamp',
        'blockNumber',
        '_lastTimestamp',
        '_player',
        '_country3',
        'id',
    ],
    select: `
        id
        _player
        _ip
        _country3
        _lastTimestamp
        blockNumber
        blockTimestamp
        transactionHash
    `,
};

const PromoPickWinnersSpec: Spec = {
    one: 'winnerPicked',
    many: 'winnerPickeds',
    filter: 'WinnerPicked_filter',
    idVar: 'Bytes!',
    orderBy: ['blockTimestamp', 'blockNumber', 'cycle', 'winner', 'id'],
    select: `
        id
        cycle
        players
        winner
        blockNumber
        blockTimestamp
        transactionHash
    `,
};

const promoBalanceSpec: Spec = {
    one: 'raffleFundsReceived',
    many: 'raffleFundsReceiveds',
    filter: 'RaffleFundsReceived_filter',
    idVar: 'Bytes!',
    orderBy: ['blockTimestamp', 'blockNumber', 'amount', 'from', 'id'],
    select: `
        id
        from
        amount
        blockNumber
        blockTimestamp
        transactionHash
    `,
};

const promoPrizePaidSpec: Spec = {
    one: 'rafflePrizePaid',
    many: 'rafflePrizePaids',
    filter: 'RafflePrizePaid_filter',
    idVar: 'Bytes!',
    orderBy: ['blockTimestamp', 'blockNumber', 'amount', 'winner', 'id'],
    select: `
        id
        winner
        amount
        blockNumber
        blockTimestamp
        transactionHash
    `,
};

const SPEC: Record<string, Spec> = {
    PromoUsers: raffleEnterSpec,
    PromoPickWinners: PromoPickWinnersSpec,
    promoBalance: promoBalanceSpec,
    promoPrizePaid: promoPrizePaidSpec,

    RafflePrizePaid: {
        one: 'rafflePrizePaid',
        many: 'rafflePrizePaids',
        filter: 'RafflePrizePaid_filter',
        idVar: 'Bytes!',
        orderBy: ['blockTimestamp', 'blockNumber', 'amount', 'winner', 'id'],
        select: `
      id
      winner
      amount
      blockNumber
      blockTimestamp
      transactionHash
    `,
    },
    WinnerPicked: {
        one: 'winnerPicked',
        many: 'winnerPickeds',
        filter: 'WinnerPicked_filter',
        idVar: 'Bytes!',
        orderBy: ['blockTimestamp', 'blockNumber', 'cycle', 'winner', 'id'],
        select: `
      id
      cycle
      players
      winner
      blockNumber
      blockTimestamp
      transactionHash
    `,
    },
};

function spec(resource: string): Spec {
    const s = SPEC[resource];
    if (!s) throw new Error(`Unknown resource: ${resource}`);
    return s;
}

function cleanWhere(f: any) {
    if (!f || typeof f !== 'object') return {};
    const w: any = {};
    for (const [k, v] of Object.entries(f)) {
        if (v === undefined || v === null) continue;
        if (typeof v === 'string' && v.trim() === '') continue;
        w[k] = v;
    }
    return w;
}

function sortOf(
    s: Spec,
    params: GetListParams | GetManyReferenceParams
): { orderBy: string; orderDirection: 'asc' | 'desc' } {
    const f = params.sort?.field ?? 'blockTimestamp';
    const o = (params.sort?.order ?? 'DESC').toUpperCase();

    const orderBy = s.orderBy.includes(f) ? f : 'blockTimestamp';
    const orderDirection: 'asc' | 'desc' = o === 'ASC' ? 'asc' : 'desc';

    return { orderBy, orderDirection };
}

type Cursor = { v: string; id: string };

// cursorCache key includes perPage to keep page->cursor mapping consistent
const cursorCache = new Map<string, Cursor[]>();

function keyOf(
    resource: string,
    orderBy: string,
    orderDirection: string,
    perPage: number,
    baseWhere: any
) {
    return JSON.stringify({
        resource,
        orderBy,
        orderDirection,
        perPage,
        baseWhere,
    });
}

function seekWhere(
    baseWhere: any,
    orderBy: string,
    dir: 'asc' | 'desc',
    cur: Cursor
) {
    // DESC: (orderBy < v) OR (orderBy == v AND id < id)
    // ASC : (orderBy > v) OR (orderBy == v AND id > id)
    if (orderBy === 'id') {
        const idCmp = dir === 'desc' ? 'id_lt' : 'id_gt';
        const seek = { [idCmp]: cur.id };
        return !baseWhere || !Object.keys(baseWhere).length
            ? seek
            : { and: [baseWhere, seek] };
    }

    const fCmp = `${orderBy}_${dir === 'desc' ? 'lt' : 'gt'}`;
    const idCmp = `id_${dir === 'desc' ? 'lt' : 'gt'}`;

    const seek = {
        or: [
            { [fCmp]: cur.v },
            {
                and: [{ [orderBy]: cur.v }, { [idCmp]: cur.id }],
            },
        ],
    };

    return !baseWhere || !Object.keys(baseWhere).length
        ? seek
        : { and: [baseWhere, seek] };
}

function ro(method: string) {
    return new Error(
        `Read-only subgraph: dataProvider.${method} is not supported.`
    );
}

export function buildPromoRaffleSubgraphDataProvider(opts?: {
    uri?: string;
    getAuthToken?: () => string | null;
}): DataProvider {
    const uri =
        opts?.uri ?? (import.meta.env.VITE_PROMO_RAFFLE_SUBGRAPH_URI as string);
    if (!uri) throw new Error('Missing VITE_PROMO_RAFFLE_SUBGRAPH_URI');

    const http = createHttpLink({ uri });

    const auth = setContext((_, { headers }) => {
        const t =
            opts?.getAuthToken?.() ??
            (import.meta.env.VITE_PROMO_RAFFLE_SUBGRAPH_API_KEY as
                | string
                | undefined);

        return {
            headers: {
                ...headers,
                ...(t ? { Authorization: `Bearer ${t}` } : null),
            },
        };
    });

    const client = new ApolloClient({
        link: auth.concat(http),
        cache: new InMemoryCache(),
    });

    async function hasNextPage(args: {
        resource: string;
        orderBy: string;
        orderDirection: 'asc' | 'desc';
        where: any;
    }) {
        const s = spec(args.resource);
        const Q = gql`
      query ${args.resource}HasNext($where: ${s.filter}) {
        next: ${s.many}(
          first: 1
          where: $where
          orderBy: ${args.orderBy}
          orderDirection: ${args.orderDirection}
        ) { id }
      }
    `;
        const r = await client.query({
            query: Q,
            variables: { where: args.where },
            fetchPolicy: 'network-only',
        });
        return (r.data?.next ?? []).length > 0;
    }

    return {
        async getList(resource, params) {
            const s = spec(resource);
            const pagination = params.pagination ?? DEFAULT_PAGINATION;
            const { page, perPage } = pagination;

            const baseWhere = cleanWhere(params.filter);
            const { orderBy, orderDirection } = sortOf(s, params);

            const k = keyOf(
                resource,
                orderBy,
                orderDirection,
                perPage,
                baseWhere
            );
            const cursors = cursorCache.get(k) ?? [];
            const prev = page > 1 ? cursors[page - 2] : undefined;

            const where = prev
                ? seekWhere(baseWhere, orderBy, orderDirection, prev)
                : baseWhere;

            const first = perPage;
            const skip = prev ? 0 : (page - 1) * perPage;

            const Q = gql`
        query ${resource}List(
          $first: Int!,
          $skip: Int!,
          $where: ${s.filter}
        ) {
          items: ${s.many}(
            first: $first
            skip: $skip
            where: $where
            orderBy: ${orderBy}
            orderDirection: ${orderDirection}
          ) {
            ${s.select}
          }
        }
      `;

            const r = await client.query({
                query: Q,
                variables: { first, skip, where },
                fetchPolicy: 'network-only',
            });

            const data = (r.data?.items ?? []) as any[];
            const last = data[data.length - 1];

            // save cursor for this page (works for both seek and skip fallback)
            if (last?.id != null && last?.[orderBy] != null) {
                cursors[page - 1] = {
                    id: String(last.id),
                    v: String(last[orderBy]),
                };
                cursorCache.set(k, cursors);
            }

            // total: probe 1 item “after last”
            let total = (page - 1) * perPage + data.length;
            if (last?.id != null && last?.[orderBy] != null) {
                const nextWhere = seekWhere(
                    baseWhere,
                    orderBy,
                    orderDirection,
                    { id: String(last.id), v: String(last[orderBy]) }
                );
                const hasNext = await hasNextPage({
                    resource,
                    orderBy,
                    orderDirection,
                    where: nextWhere,
                });
                if (hasNext) total = page * perPage + 1;
            }

            return { data, total };
        },

        async getOne(resource, params: GetOneParams) {
            const s = spec(resource);
            const Q = gql`
        query ${resource}One($id: ${s.idVar}) {
          data: ${s.one}(id: $id) {
            ${s.select}
          }
        }
      `;
            const r = await client.query({
                query: Q,
                variables: { id: params.id },
                fetchPolicy: 'network-only',
            });
            if (!r.data?.data) {
                throw new Error(`${resource} not found: ${params.id}`);
            }
            return { data: r.data.data };
        },

        async getMany(resource, params: GetManyParams) {
            const s = spec(resource);
            const where = { id_in: params.ids };
            const Q = gql`
        query ${resource}Many($where: ${s.filter}) {
          items: ${s.many}(where: $where, first: 1000) {
            ${s.select}
          }
        }
      `;
            const r = await client.query({
                query: Q,
                variables: { where },
                fetchPolicy: 'network-only',
            });
            return { data: (r.data?.items ?? []) as any[] };
        },

        async getManyReference(resource, params: GetManyReferenceParams) {
            const s = spec(resource);
            const pagination = params.pagination ?? DEFAULT_PAGINATION;
            const { page, perPage } = pagination;

            const baseWhere = {
                ...cleanWhere(params.filter),
                [params.target]: params.id,
            };

            const { orderBy, orderDirection } = sortOf(s, params);

            const k = keyOf(
                `ref:${resource}:${params.target}:${params.id}`,
                orderBy,
                orderDirection,
                perPage,
                baseWhere
            );
            const cursors = cursorCache.get(k) ?? [];
            const prev = page > 1 ? cursors[page - 2] : undefined;

            const where = prev
                ? seekWhere(baseWhere, orderBy, orderDirection, prev)
                : baseWhere;

            const first = perPage;
            const skip = prev ? 0 : (page - 1) * perPage;

            const Q = gql`
        query ${resource}RefList(
          $first: Int!,
          $skip: Int!,
          $where: ${s.filter}
        ) {
          items: ${s.many}(
            first: $first
            skip: $skip
            where: $where
            orderBy: ${orderBy}
            orderDirection: ${orderDirection}
          ) {
            ${s.select}
          }
        }
      `;

            const r = await client.query({
                query: Q,
                variables: { first, skip, where },
                fetchPolicy: 'network-only',
            });

            const data = (r.data?.items ?? []) as any[];
            const last = data[data.length - 1];

            if (last?.id != null && last?.[orderBy] != null) {
                cursors[page - 1] = {
                    id: String(last.id),
                    v: String(last[orderBy]),
                };
                cursorCache.set(k, cursors);
            }

            // reference totals are usually fine as “so far”
            const total = (page - 1) * perPage + data.length;
            return { data, total };
        },

        async create() {
            throw ro('create');
        },
        async update() {
            throw ro('update');
        },
        async delete() {
            throw ro('delete');
        },
        async updateMany() {
            throw ro('updateMany');
        },
        async deleteMany() {
            throw ro('deleteMany');
        },
    };
}
