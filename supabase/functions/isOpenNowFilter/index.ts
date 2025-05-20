// supabase/functions/isOpenNowFilter/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface DaySchedule {
  open?: string;
  close?: string;
}
interface SpotHours {
  [day: string]: DaySchedule | undefined;
}

interface StudySpot {
  id: string;
  name: string;
  hours: SpotHours | null;
}

function getCurrentMelbourneTime(): { dayOfWeek: string; currentTime: string; yesterdayDayOfWeek: string } {
  const nowInUTC = new Date();
  const melbourneTime = new Date(nowInUTC.toLocaleString("en-US", { timeZone: "Australia/Melbourne" }));

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayIndex = melbourneTime.getDay();
  const dayOfWeek = days[dayIndex];
  
  const yesterdayIndex = (dayIndex - 1 + 7) % 7;
  const yesterdayDayOfWeek = days[yesterdayIndex];

  const hours = melbourneTime.getHours().toString().padStart(2, '0');
  const minutes = melbourneTime.getMinutes().toString().padStart(2, '0');
  const currentTime = `${hours}:${minutes}`;

  return { dayOfWeek, currentTime, yesterdayDayOfWeek };
}

function isSpotOpen(
  spotHours: SpotHours | null,
  melbourneDay: string,
  melbourneCurrentTime: string,
  melbourneYesterdayDay: string
): boolean {
  if (!spotHours) return false;

  const todaySchedule = spotHours[melbourneDay.toLowerCase()];
  if (todaySchedule && todaySchedule.open && todaySchedule.close) {
    const openTime = todaySchedule.open;
    const closeTime = todaySchedule.close;

    if (openTime.toLowerCase() === 'closed' || closeTime.toLowerCase() === 'closed') {
      // No operation, will be false unless yesterday's overnight covers it
    } else if (openTime < closeTime) { 
      if (melbourneCurrentTime >= openTime && melbourneCurrentTime < closeTime) {
        return true;
      }
    } else if (openTime > closeTime) { 
      if (melbourneCurrentTime >= openTime) {
        return true;
      }
    }
  }

  const yesterdaySchedule = spotHours[melbourneYesterdayDay.toLowerCase()];
  if (yesterdaySchedule && yesterdaySchedule.open && yesterdaySchedule.close) {
    const openTimeYesterday = yesterdaySchedule.open;
    const closeTimeYesterday = yesterdaySchedule.close;

    if (openTimeYesterday.toLowerCase() !== 'closed' && 
        closeTimeYesterday.toLowerCase() !== 'closed' &&
        openTimeYesterday > closeTimeYesterday) { 
      if (melbourneCurrentTime < closeTimeYesterday) {
        return true;
      }
    }
  }
  
  return false;
}

serve(async (_req: any) => {
  try {
    const supabaseUrl = Deno.env.get('APP_SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('APP_SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing APP_SUPABASE_URL or APP_SUPABASE_SERVICE_ROLE_KEY environment variables.');
    }

    const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: `Bearer ${supabaseServiceKey}` } }
    });

    const { data: spotsData, error: fetchError } = await supabaseClient
      .from('study_spots')
      .select('id, name, hours');

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      throw fetchError;
    }

    if (!spotsData) {
      return new Response(JSON.stringify({ openSpotIds: [] }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const { dayOfWeek, currentTime, yesterdayDayOfWeek } = getCurrentMelbourneTime();

    const openSpotIds = (spotsData as StudySpot[])
      .filter(spot => isSpotOpen(spot.hours, dayOfWeek, currentTime, yesterdayDayOfWeek))
      .map(spot => spot.id);
    
    return new Response(JSON.stringify({ openSpotIds }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in isOpenNowFilter function:', error.stack || error.toString());
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});