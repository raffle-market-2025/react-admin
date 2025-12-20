import * as React from 'react';
import {
    DateField,
    FunctionField,
    Show,
    SimpleShowLayout,
    TextField,
    ShowProps,
} from 'react-admin';
import { Chip, Stack, Typography } from '@mui/material';

function shortHex(v?: string, left = 8, right = 6) {
    if (!v) return '';
    if (v.length <= left + right + 2) return v;
    return `${v.slice(0, left + 2)}…${v.slice(-right)}`;
}

function toDateFromSeconds(sec?: string | number) {
    if (sec == null) return null;
    const n = typeof sec === 'number' ? sec : Number(sec);
    if (!Number.isFinite(n)) return null;
    return new Date(n * 1000);
}

const PlayersChips = () => (
    <FunctionField
        label="Players"
        render={(r: any) => {
            const players = (r?.players ?? []) as string[];
            if (!players.length)
                return <Typography variant="body2">—</Typography>;

            return (
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {players.map((p, idx) => (
                        <Chip
                            key={`${p}-${idx}`}
                            size="small"
                            variant="outlined"
                            label={shortHex(String(p))}
                            title={String(p)}
                        />
                    ))}
                </Stack>
            );
        }}
    />
);

export const PromoPickWinnersShow = (props: ShowProps) => (
    <Show {...props}>
        <SimpleShowLayout>
            <TextField source="id" label="ID" />
            <TextField source="cycle" label="Cycle" />

            <FunctionField
                label="Winner"
                render={(r: any) => (r?.winner ? String(r.winner) : '—')}
            />

            <PlayersChips />

            <TextField source="blockNumber" label="Block" />

            <FunctionField
                label="Time"
                render={(r: any) => {
                    const d = toDateFromSeconds(r?.blockTimestamp);
                    return d ? (
                        <DateField
                            source="blockTimestamp"
                            record={{ blockTimestamp: d.toISOString() }}
                            showTime
                        />
                    ) : (
                        '—'
                    );
                }}
            />

            <FunctionField
                label="Tx hash"
                render={(r: any) =>
                    r?.transactionHash ? String(r.transactionHash) : '—'
                }
            />
        </SimpleShowLayout>
    </Show>
);
