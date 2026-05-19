import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';

function icsDate(iso: string) {
  // Format: 20260615T090000Z
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function icsEscape(str: string) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tripName, events } = body as {
    tripName: string;
    events: { summary: string; description: string; start: string; end: string }[];
  };

  const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}@wandervault`;

  const vevents = events.map(e => [
    'BEGIN:VEVENT',
    `UID:${uid()}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.start)}`,
    `DTEND:${icsDate(e.end)}`,
    `SUMMARY:${icsEscape(e.summary)}`,
    `DESCRIPTION:${icsEscape(e.description)}`,
    'END:VEVENT',
  ].join('\r\n')).join('\r\n');

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WanderVault//TripPlanner//EN',
    `X-WR-CALNAME:${icsEscape(tripName ?? 'My Trip')}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n');

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${(tripName ?? 'trip').replace(/[^a-z0-9]/gi, '_')}.ics"`,
    },
  });
}
