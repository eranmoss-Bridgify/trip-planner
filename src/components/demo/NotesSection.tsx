'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Save, StickyNote } from 'lucide-react';
import { Note } from '@/lib/mock-data';

interface NotesSectionProps {
    initialNotes: Note[];
}

export function NotesSection({ initialNotes }: NotesSectionProps) {
    const [notes, setNotes] = useState<Note[]>(initialNotes);
    const [isAdding, setIsAdding] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    const handleAddNote = () => {
        if (!newNoteContent.trim()) return;
        const note: Note = {
            id: `n${Date.now()}`,
            title: 'New Note',
            content: newNoteContent,
            updatedAt: new Date().toISOString()
        };
        setNotes([note, ...notes]);
        setNewNoteContent('');
        setIsAdding(false);
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <StickyNote className="h-5 w-5" />
                    Trip Notes
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsAdding(!isAdding)}>
                    <Plus className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                {isAdding && (
                    <div className="space-y-2">
                        <Textarea
                            placeholder="Write a note..."
                            value={newNoteContent}
                            onChange={(e) => setNewNoteContent(e.target.value)}
                        />
                        <Button size="sm" onClick={handleAddNote} className="w-full">
                            <Save className="h-4 w-4 mr-2" /> Save Note
                        </Button>
                    </div>
                )}
                <div className="space-y-3">
                    {notes.map((note) => (
                        <div key={note.id} className="p-3 bg-muted/30 rounded-lg text-sm border">
                            <p className="whitespace-pre-wrap">{note.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">
                                {new Date(note.updatedAt).toLocaleDateString()}
                            </p>
                        </div>
                    ))}
                    {notes.length === 0 && !isAdding && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No notes yet. Top + to add one.
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
