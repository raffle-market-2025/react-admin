import * as React from 'react';
import {
    Show,
    SimpleShowLayout,
    TextField,
    FunctionField,
    ShowProps,
} from 'react-admin';
import { Chip, Stack, Typography } from '@mui/material';

function shortHex(v?: string, left = 10, right = 8) {
    if (!v) return '';
    if (!v.startsWith('0x')) return v;
    if (v.length <= left + right + 2) return v;
    return `${v.slice(0, left + 2)}…${v.slice(-right)}`;
}

function toDateFromSeconds(sec?: string | number) {
    if (sec == null) return null;
    const n = typeof sec === 'number' ? sec : Number(sec);
    if (!Number.isFinite(n)) return null;
    return new Date(n * 1000);
}

const MonoRow = ({ label, value }: { label: string; value?: string }) => (
    <Stack spacing={0.5}>
        <Typography variant="subtitle2">{label}</Typography>
        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {value ?? '—'}
        </Typography>
    </Stack>
);

export const PromoUsersShow = (props: ShowProps) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="id" label="ID" />

            <FunctionField
                label="Player"
                render={(r: any) =>
                    r?._player ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            label={shortHex(String(r._player))}
                            title={String(r._player)}
                        />
                    ) : (
                        '—'
                    )
                }
            />

            <FunctionField
                label="IP"
                render={(r: any) =>
                    r?._ip ? (
                        <Chip
                            size="small"
                            variant="outlined"
                            label={String(r._ip)}
                        />
                    ) : (
                        '—'
                    )
                }
            />

            <FunctionField
                label="Country3"
                render={(r: any) =>
                    r?._country3 ? (
                        <Chip
                            size="small"
                            label={shortHex(String(r._country3), 8, 6)}
                            title={String(r._country3)}
                        />
                    ) : (
                        '—'
                    )
                }
            />

            <FunctionField
                label="Last timestamp"
                render={(r: any) => {
                    const d = toDateFromSeconds(r?._lastTimestamp);
                    return d ? d.toLocaleString() : r?._lastTimestamp ?? '—';
                }}
            />

            <TextField source="blockNumber" label="Block" />

            <FunctionField
                label="Block timestamp"
                render={(r: any) => {
                    const d = toDateFromSeconds(r?.blockTimestamp);
                    return d ? d.toLocaleString() : r?.blockTimestamp ?? '—';
                }}
            />

            <FunctionField
                label="Transaction hash"
                render={(r: any) =>
                    r?.transactionHash ? (
                        <MonoRow
                            label="Tx hash"
                            value={String(r.transactionHash)}
                        />
                    ) : (
                        '—'
                    )
                }
            />
        </SimpleShowLayout>
    </Show>
);
