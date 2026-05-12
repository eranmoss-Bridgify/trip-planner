'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Upload, Download, FileType, Ticket } from 'lucide-react';
import { TripDocument } from '@/lib/mock-data';

interface DocumentsWalletProps {
    initialDocs: TripDocument[];
}

export function DocumentsWallet({ initialDocs }: DocumentsWalletProps) {
    const [docs, setDocs] = useState<TripDocument[]>(initialDocs);

    const handleUpload = () => {
        // Simulate upload
        const newDoc: TripDocument = {
            id: `d${Date.now()}`,
            name: 'Booking_Confirmation.pdf',
            type: 'PDF',
            url: '#',
            dateAdded: new Date().toISOString()
        };
        setDocs([...docs, newDoc]);
    };

    const getIcon = (type: TripDocument['type']) => {
        switch (type) {
            case 'Ticket': return <Ticket className="h-4 w-4" />;
            case 'PDF': return <FileType className="h-4 w-4" />;
            default: return <FileText className="h-4 w-4" />;
        }
    };

    return (
        <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Documents
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={handleUpload}>
                    <Upload className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="space-y-2">
                {docs.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-lg group transition-colors">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 text-primary rounded-md">
                                {getIcon(doc.type)}
                            </div>
                            <div className="space-y-0.5">
                                <p className="text-sm font-medium leading-none">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{doc.type}</p>
                            </div>
                        </div>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <Download className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
                {docs.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                        No documents. Upload tickets or vouchers.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
