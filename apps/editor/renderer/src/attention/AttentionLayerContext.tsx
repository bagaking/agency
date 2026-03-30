import React, { createContext, useContext } from 'react';

import type { AttentionItem } from './attentionModel';
import type { WindowAttentionSummary } from '../../../shared/attention';

type AttentionCellSummary = {
  count: number;
  strongest: AttentionItem;
};

export type AttentionLayerValue = {
  localItems: AttentionItem[];
  windowItems: AttentionItem[];
  allItems: AttentionItem[];
  primaryItem: AttentionItem | null;
  localSummary: WindowAttentionSummary;
  byCellId: Record<string, AttentionCellSummary>;
  bySessionKey: Record<string, AttentionItem>;
  jumpToAttention: (item: AttentionItem | null | undefined) => void;
};

const EMPTY_SUMMARY: WindowAttentionSummary = {
  version: 1,
  itemCount: 0,
  highestSeverity: 'none',
  countsByKind: {},
  primary: null,
  updatedAt: '',
};

const DEFAULT_VALUE: AttentionLayerValue = {
  localItems: [],
  windowItems: [],
  allItems: [],
  primaryItem: null,
  localSummary: EMPTY_SUMMARY,
  byCellId: {},
  bySessionKey: {},
  jumpToAttention: () => undefined,
};

const AttentionLayerContext = createContext<AttentionLayerValue>(DEFAULT_VALUE);

export function AttentionLayerProvider({
  value,
  children,
}: {
  value: AttentionLayerValue;
  children: React.ReactNode;
}) {
  return (
    <AttentionLayerContext.Provider value={value}>
      {children}
    </AttentionLayerContext.Provider>
  );
}

export function useAttentionLayer(): AttentionLayerValue {
  return useContext(AttentionLayerContext);
}
