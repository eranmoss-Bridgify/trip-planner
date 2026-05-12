'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Share2, Copy, Check, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trip } from '@/lib/mock-data';

interface ShareDialogProps {
    trip: Trip;
}

export function ShareDialog({ trip }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const [email, setEmail] = useState('');
    const [collaborators, setCollaborators] = useState(trip.collaborators);

    const handleCopy = () => {
        navigator.clipboard.writeText(`https://elal-trip.com/join/${trip.id}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleInvite = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        // Simulate invite
        const newCollab = {
            id: `u${Date.now()}`,
            name: email.split('@')[0],
            email: email,
            avatar: '',
            role: 'Viewer' as const
        };

        setCollaborators([...collaborators, newCollab]);
        setEmail('');
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Share2 className="h-4 w-4" /> Share
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Share Trip</DialogTitle>
                    <DialogDescription>
                        Invite others to plan "{trip.name}" with you.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex items-center space-x-2 mt-2">
                    <div className="grid flex-1 gap-2">
                        <Label htmlFor="link" className="sr-only">
                            Link
                        </Label>
                        <Input
                            id="link"
                            defaultValue={`https://elal-trip.com/join/${trip.id}`}
                            readOnly
                        />
                    </div>
                    <Button type="submit" size="sm" className="px-3" onClick={handleCopy}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                </div>

                <div className="border-t my-4" />

                <div className="space-y-4">
                    <h4 className="text-sm font-medium">Collaborators</h4>
                    <div className="grid gap-4">
                        {collaborators.map((user) => (
                            <div key={user.id} className="flex items-center justify-between space-x-4">
                                <div className="flex items-center space-x-4">
                                    <Avatar>
                                        <AvatarImage src={user.avatar} />
                                        <AvatarFallback>{user.name[0].toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-medium leading-none">{user.name}</p>
                                        <p className="text-sm text-muted-foreground">{user.email}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-muted-foreground">{user.role}</span>
                            </div>
                        ))}
                    </div>

                    <form onSubmit={handleInvite} className="flex items-center gap-2 mt-4">
                        <Input
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button type="submit" size="icon">
                            <UserPlus className="h-4 w-4" />
                        </Button>
                    </form>
                </div>

            </DialogContent>
        </Dialog>
    );
}
