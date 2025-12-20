import * as React from 'react';
import { Card, CardContent, Stack, Typography } from '@mui/material';
import { useRecordContext } from 'react-admin';

type RafflePrizePaid = {
    id: string;
    winner: string;
    amount: string;
    blockNumber: string;
    blockTimestamp: string;
    transactionHash: string;
};

const formatTs = (ts?: string) => {
    if (!ts) return '';
    const n = Number(ts);
    if (!Number.isFinite(n)) return ts;
    return new Date(n * 1000).toLocaleString();
};

const pow10 = (decimals: number) => {
    let p = 1n;
    for (let i = 0; i < decimals; i++) p *= 10n;
    return p;
};

const weiToEth = (wei?: string, decimals = 18) => {
    if (!wei) return '';
    try {
        const w = BigInt(wei);
        const base = pow10(decimals);
        const i = w / base;
        const f = (w % base)
            .toString()
            .padStart(decimals, '0')
            .replace(/0+$/, '');
        return f ? `${i}.${f}` : i.toString();
    } catch {
        return wei;
    }
};

const PromoPrizePaidShow = () => {
    const r = useRecordContext<RafflePrizePaid>();
    if (!r) return null;

    return (
        <Card sx={{ m: 1 }}>
            <CardContent>
                <Stack spacing={1.25}>
                    <Typography variant="subtitle2">Winner</Typography>
                    <Typography variant="body2">{r.winner}</Typography>

                    <Typography variant="subtitle2">Amount</Typography>
                    <Typography variant="body2">
                        {r.amount} wei ({weiToEth(r.amount)} eth)
                    </Typography>

                    <Typography variant="subtitle2">Block</Typography>
                    <Typography variant="body2">
                        #{r.blockNumber} at {formatTs(r.blockTimestamp)} (ts:{' '}
                        {r.blockTimestamp})
                    </Typography>

                    <Typography variant="subtitle2">Transaction</Typography>
                    <Typography variant="body2">{r.transactionHash}</Typography>

                    <Typography variant="subtitle2">Entity id</Typography>
                    <Typography variant="body2">{r.id}</Typography>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default PromoPrizePaidShow;
