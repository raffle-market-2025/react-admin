import * as React from 'react';
import { Show, SimpleShowLayout, TextField, FunctionField } from 'react-admin';
import { countryHexToFlag } from '../utils/country';

const tsToLocal = (v?: any) => {
    const s = v == null ? '' : String(v);
    const num = Number(s);
    if (!Number.isFinite(num) || num <= 0) return '';
    return new Date(num * 1000).toLocaleString();
};

export const PromoUsersShow = () => (
    <Show>
        <SimpleShowLayout>
            <TextField source="id" />
            <TextField source="_player" label="Player" />
            <TextField source="_ipHash" label="IP hash" />
            <FunctionField
                label="Country"
                render={(r: any) => {
                    // ABI сейчас bytes2 => _country2.
                    // Fallback на _country3 на случай старых данных/смешанных источников.
                    const raw = r?._country2 ?? r?._country3;
                    const { flag, a3, a2 } = countryHexToFlag(raw);
                    return a2 ? `${flag} ${a3} (${a2})` : `${flag} ${a3}`;
                }}
            />
            <TextField source="cycle" label="Cycle" />
            <FunctionField
                label="LastTimestamp"
                render={(r: any) => tsToLocal(r?._lastTimestamp)}
            />
            <TextField source="blockNumber" />
            <FunctionField
                label="BlockTimestamp"
                render={(r: any) => tsToLocal(r?.blockTimestamp)}
            />
            <TextField source="transactionHash" />
        </SimpleShowLayout>
    </Show>
);
