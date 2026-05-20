'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, X, Send, Trash2, Loader2, Bot, Star, Clock, MapPin, Lock, ExternalLink } from 'lucide-react';
import { cn, fmtPrice } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

interface Activity {
    id: string;
    uuid?: string;
    name: string;
    category?: string;
    price?: number;
    currency?: string;
    duration?: string;
    image?: string;
    rating?: number;
    location?: string;
    description?: string;
}

interface Proposal {
    type: 'add' | 'remove';
    activity?: Activity;
    legId: string;
    dayDate?: string;
    activityId?: string;
    activityName?: string;
    dayIndex?: number;
    activityIndex?: number;
    reason: string;
    _done?: boolean;
}

interface Message {
    role: 'user' | 'assistant';
    content: string;
    proposals?: Proposal[];
}

interface AIChatPanelProps {
    trip: any;
    onOpenServiceDetails?: (service: any, type: 'Hotel' | 'Attraction') => void;
}

const QUICK_PROMPTS = [
    'What should I add to my trip?',
    'Suggest a full day plan',
    'Find outdoor activities',
    'What are the must-sees?',
];

function ltmKey(userId: string, tripId: string) {
    return `chat_ltm_${userId}_${tripId}`;
}

function loadLtm(userId: string, tripId: string): Message[] | null {
    try {
        const raw = localStorage.getItem(ltmKey(userId, tripId));
        return raw ? JSON.parse(raw) : null;
    } catch { return null; }
}

function saveLtm(userId: string, tripId: string, messages: Message[]) {
    try {
        // Keep last 60 messages to cap storage
        const trimmed = messages.slice(-60);
        localStorage.setItem(ltmKey(userId, tripId), JSON.stringify(trimmed));
    } catch { /* storage full — ignore */ }
}

export function AIChatPanel({ trip, onOpenServiceDetails }: AIChatPanelProps) {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const greeting = useCallback((): Message => ({
        role: 'assistant',
        content: `Hi! I'm your trip assistant.\n\nI'm all set to help with your **${trip?.name || 'trip'}** — I can suggest activities, help fill your days, or answer any travel questions.\n\nWhat would you like to do?`,
    }), [trip?.id, trip?.name, trip?.destination]);

    // Load/reset history when trip or auth state changes
    useEffect(() => {
        if (user && trip?.id) {
            const saved = loadLtm(user.id, trip.id);
            setMessages(saved ?? [greeting()]);
        } else {
            // Guest: always start fresh
            setMessages([greeting()]);
        }
    }, [trip?.id, user?.id]);

    // Persist for logged-in users whenever messages change
    useEffect(() => {
        if (user && trip?.id && messages.length > 1) {
            saveLtm(user.id, trip.id, messages);
        }
    }, [messages, user?.id, trip?.id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
    }, [isOpen]);

    const send = async (text?: string) => {
        const content = (text ?? input).trim();
        if (!content || isLoading) return;

        const userMsg: Message = { role: 'user', content };
        const next = [...messages, userMsg];
        setMessages(next);
        setInput('');
        setIsLoading(true);

        try {
            // Anthropic requires conversations to start with a user message.
            // The greeting is role:'assistant' so strip any leading assistant turns.
            const firstUserIdx = next.findIndex(m => m.role === 'user');
            const apiMessages = firstUserIdx >= 0
                ? next.slice(firstUserIdx).map(m => ({ role: m.role, content: m.content }))
                : [];

            const res = await fetch('/api/ai-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: apiMessages,
                    trip,
                }),
            });
            console.log('[ai-chat] res.status:', res.status, 'res.ok:', res.ok);
            if (!res.ok) throw new Error('Request failed');
            const data = await res.json();
            console.log('[ai-chat] data:', JSON.stringify(data).slice(0, 300));
            const hasProposals = data.proposals?.length > 0;
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.text || (hasProposals ? 'Here are some options I found — tap "Add to Trip" on any you like.' : 'Sorry, I had trouble responding.'),
                proposals: hasProposals ? data.proposals : undefined,
            }]);
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Something went wrong — please try again.',
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const dismissProposal = (target: Proposal) => {
        setMessages(prev => prev.map(m => ({
            ...m,
            proposals: m.proposals?.filter(p => p !== target),
        })));
    };

    const isOnlyGreeting = messages.length === 1;

    return (
        <>
            {/* Floating trigger */}
            <button
                onClick={() => setIsOpen(o => !o)}
                className={cn(
                    'fixed bottom-6 right-6 z-50 rounded-full w-14 h-14 flex items-center justify-center',
                    'bg-gradient-to-br from-indigo-500 to-violet-600 shadow-xl shadow-indigo-500/30',
                    'transition-all duration-300 hover:scale-110 active:scale-95',
                    'hover:shadow-2xl hover:shadow-indigo-500/40',
                )}
                aria-label="AI Trip Assistant"
            >
                <div className={cn('transition-transform duration-300', isOpen && 'rotate-90')}>
                    {isOpen ? <X className="h-6 w-6 text-white" /> : <Sparkles className="h-6 w-6 text-white" />}
                </div>
                {!isOpen && (
                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                )}
            </button>

            {/* Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/10 backdrop-blur-[2px]"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Panel */}
            <div className={cn(
                'fixed right-0 top-0 h-full z-50 flex flex-col',
                'w-full sm:w-[420px]',
                'bg-background border-l shadow-2xl',
                'transition-transform duration-300 ease-out',
                isOpen ? 'translate-x-0' : 'translate-x-full',
            )}>
                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-4 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600">
                    <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/20">
                        <Bot className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-semibold text-sm leading-none mb-0.5">Trip Assistant</p>
                        <p className="text-white/60 text-xs truncate">
                            {user ? `Memory on · ${user.name || user.email}` : 'Sign in to save history'}
                        </p>
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                        {user && messages.length > 1 && (
                            <button
                                onClick={() => {
                                    const fresh = [greeting()];
                                    setMessages(fresh);
                                    if (trip?.id) saveLtm(user.id, trip.id, fresh);
                                }}
                                className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 text-xs"
                                title="Clear chat history"
                            >
                                Clear
                            </button>
                        )}
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                    {messages.map((msg, i) => (
                        <div key={i} className={cn('flex flex-col', msg.role === 'user' ? 'items-end' : 'items-start')}>
                            <div className={cn(
                                'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                                hasTable(msg.content) ? 'w-full' : 'max-w-[88%]',
                                msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-tr-sm'
                                    : 'bg-muted text-foreground rounded-tl-sm',
                            )}>
                                <RichText text={msg.content} />
                            </div>

                            {msg.proposals?.map((p, pi) => (
                                <div key={pi} className="mt-2 w-[88%]">
                                    <ProposalCard
                                        proposal={p}
                                        trip={trip}
                                        onDismiss={() => dismissProposal(p)}
                                        onViewDetails={onOpenServiceDetails}
                                    />
                                </div>
                            ))}
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex items-start">
                            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                <span>Thinking…</span>
                            </div>
                        </div>
                    )}
                    <div ref={bottomRef} />
                </div>

                {/* Quick prompts */}
                {isOnlyGreeting && !isLoading && (
                    <div className="px-4 pb-3 flex flex-wrap gap-2">
                        {QUICK_PROMPTS.map(p => (
                            <button
                                key={p}
                                onClick={() => send(p)}
                                className="text-xs px-3 py-1.5 rounded-full border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}

                {/* Guest nudge */}
                {!user && (
                    <div className="mx-4 mb-2 flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        <span>Sign in to save this conversation across sessions.</span>
                    </div>
                )}

                {/* Input */}
                <div className="shrink-0 px-4 pb-4 pt-2 border-t bg-background">
                    <div className="flex gap-2 items-end">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                            placeholder="Ask anything about your trip…"
                            rows={1}
                            className={cn(
                                'flex-1 resize-none rounded-xl border bg-muted/50 px-3 py-2.5 text-sm',
                                'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/40',
                                'min-h-[42px] max-h-[120px] overflow-y-auto',
                            )}
                        />
                        <Button
                            onClick={() => send()}
                            disabled={!input.trim() || isLoading}
                            size="icon"
                            className="shrink-0 h-[42px] w-[42px] rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-sm"
                        >
                            <Send className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
}

function hasTable(text: string): boolean {
    return text.split('\n').some(l => l.trim().startsWith('|'));
}

function parseTableRow(line: string): string[] {
    return line.split('|').slice(1, -1).map(c => c.trim());
}

function isSeparatorRow(line: string): boolean {
    return /^\|[\s\-:|]+\|$/.test(line.trim());
}

function InlineMd({ text }: { text: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <>
            {parts.map((p, i) =>
                p.startsWith('**') && p.endsWith('**')
                    ? <strong key={i}>{p.slice(2, -2)}</strong>
                    : <span key={i}>{p}</span>
            )}
        </>
    );
}

function MarkdownTable({ lines }: { lines: string[] }) {
    const dataRows = lines.filter(l => !isSeparatorRow(l));
    if (dataRows.length < 2) return null;
    const headers = parseTableRow(dataRows[0]);
    const rows = dataRows.slice(1).map(parseTableRow);

    return (
        <div className="my-2 rounded-xl overflow-hidden border border-border/60 shadow-sm">
            <table className="w-full text-xs">
                <thead>
                    <tr className="bg-indigo-600/10 border-b border-border/60">
                        {headers.map((h, i) => (
                            <th key={i} className="px-3 py-2 text-left font-semibold text-foreground first:rounded-tl-xl last:rounded-tr-xl">
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className={cn('border-t border-border/40 hover:bg-indigo-50/50 transition-colors', ri % 2 === 1 && 'bg-muted/30')}>
                            {row.map((cell, ci) => (
                                <td key={ci} className="px-3 py-2 text-foreground">
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function RichText({ text }: { text: string }) {
    const lines = text.split('\n');
    const blocks: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
        const line = lines[i];

        if (line.trim().startsWith('|')) {
            const tableLines: string[] = [];
            while (i < lines.length && lines[i].trim().startsWith('|')) {
                tableLines.push(lines[i]);
                i++;
            }
            blocks.push(<MarkdownTable key={`t-${i}`} lines={tableLines} />);
        } else if (line.trim().startsWith('## ') || line.trim().startsWith('# ')) {
            const lvl = line.startsWith('## ') ? 2 : 1;
            const content = line.replace(/^#+\s*/, '');
            blocks.push(
                <p key={`h-${i}`} className={cn('font-bold mt-2 mb-0.5', lvl === 1 ? 'text-base' : 'text-sm')}>
                    <InlineMd text={content} />
                </p>
            );
            i++;
        } else if (line === '') {
            blocks.push(<div key={`sp-${i}`} className="h-1.5" />);
            i++;
        } else {
            blocks.push(
                <span key={`l-${i}`} className="block"><InlineMd text={line} /></span>
            );
            i++;
        }
    }

    return <>{blocks}</>;
}

function ProposalCard({ proposal, trip, onDismiss, onViewDetails }: {
    proposal: Proposal;
    trip: any;
    onDismiss: () => void;
    onViewDetails?: (service: any, type: 'Hotel' | 'Attraction') => void;
}) {
    if (proposal._done) {
        return null;
    }

    if (proposal.type === 'add' && proposal.activity) {
        const act = proposal.activity;
        const leg = trip?.legs?.find((l: any) => l.id === proposal.legId);
        const dayLabel = proposal.dayDate
            ? new Date(proposal.dayDate + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
            : 'your trip';

        const handleViewDetails = () => {
            if (!onViewDetails) return;
            onViewDetails({
                id: act.id,
                name: act.name,
                image: act.image || '',
                images: act.image ? [act.image] : [],
                category: act.category || 'Tour',
                price: act.price || 0,
                currency: act.currency || 'USD',
                duration: act.duration || '',
                durationMinutes: 0,
                rating: act.rating || 0,
                reviewCount: 0,
                location: act.location || '',
                description: act.description || '',
                highlights: [],
                cancellationPolicy: '',
                reviews: [],
                ticketTypes: [],
                // Pass the Bridgify internal uuid so the checkout cart flow has the right ID
                availabilityUuid: act.uuid || act.id,
            }, 'Attraction');
        };

        return (
            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                {act.image && (
                    <div className="h-36 bg-muted overflow-hidden cursor-pointer" onClick={handleViewDetails}>
                        <img
                            src={act.image}
                            alt={act.name}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                    </div>
                )}
                <div className="p-3">
                    <p
                        className="font-semibold text-sm leading-snug mb-1.5 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={handleViewDetails}
                    >
                        {act.name}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mb-1.5">
                        {act.rating ? <span className="flex items-center gap-0.5"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{act.rating}</span> : null}
                        {act.duration ? <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{act.duration}</span> : null}
                        {act.location ? <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{act.location}</span> : null}
                    </div>
                    {act.price ? <p className="text-sm font-bold mb-1.5">{fmtPrice(act.price, act.currency || 'USD')}</p> : null}
                    <p className="text-xs text-muted-foreground italic mb-2 leading-snug">{proposal.reason}</p>
                    <p className="text-xs text-indigo-600 font-medium mb-3">
                        → {leg?.title || leg?.location || 'Trip'} · {dayLabel}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            className="flex-1 h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                            onClick={handleViewDetails}
                        >
                            <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Details
                        </Button>
                        <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={onDismiss}>
                            Dismiss
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    if (proposal.type === 'remove') {
        return (
            <div className="rounded-xl border bg-card shadow-sm p-3">
                <div className="flex items-start gap-2 mb-3">
                    <Trash2 className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                        <p className="text-sm font-medium">{proposal.activityName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{proposal.reason}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="sm" variant="destructive" className="flex-1 h-8 text-xs" onClick={onDismiss}>Remove</Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={onDismiss}>Keep it</Button>
                </div>
            </div>
        );
    }

    return null;
}
