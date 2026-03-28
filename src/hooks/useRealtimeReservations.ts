import { useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribes to Supabase Realtime broadcast events for a restaurant channel.
 * Triggers `onEvent` callback when any reservation event fires, letting
 * the consumer re-fetch data.
 *
 * Events listened: RESERVATION_CREATED, RESERVATION_UPDATED,
 *                  RESERVATION_STATUS_UPDATED, RESERVATION_CANCELLED
 */
export function useRealtimeReservations(
  orgId: string | undefined,
  onEvent: () => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!orgId || !supabase) return;

    // Clean up any previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    const channelName = `restaurant_${orgId}`;

    const channel = supabase
      .channel(channelName)
      .on('broadcast', { event: 'RESERVATION_CREATED' }, () => {
        console.log('[Realtime] RESERVATION_CREATED received');
        onEvent();
      })
      .on('broadcast', { event: 'RESERVATION_UPDATED' }, () => {
        console.log('[Realtime] RESERVATION_UPDATED received');
        onEvent();
      })
      .on('broadcast', { event: 'RESERVATION_STATUS_UPDATED' }, () => {
        console.log('[Realtime] RESERVATION_STATUS_UPDATED received');
        onEvent();
      })
      .on('broadcast', { event: 'RESERVATION_CANCELLED' }, () => {
        console.log('[Realtime] RESERVATION_CANCELLED received');
        onEvent();
      })
      .subscribe((status) => {
        console.log(`[Realtime] Channel ${channelName}:`, status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current && supabase) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [orgId]); // intentionally exclude onEvent to avoid resubscribing on every render
}
