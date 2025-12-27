'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Shield,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertTriangle
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  action: string;
  actorType: string;
  amount: number | null;
  createdAt: string;
  signature: string | null;
}

interface Props {
  offeringId: string;
}

export default function EscrowAuditLog({ offeringId }: Props) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLogs();
  }, [offeringId]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/dex/audit?offeringId=${offeringId}&limit=20`);
      const data = await res.json();
      
      if (data.success) {
        setLogs(data.logs);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      setError('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'VAULT_CREATED':
        return <Shield className="h-4 w-4 text-blue-500" />;
      case 'DEPOSIT_RECEIVED':
      case 'DEPOSIT_VERIFIED':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'DISTRIBUTION_INITIATED':
      case 'DISTRIBUTION_COMPLETED':
        return <ArrowUpRight className="h-4 w-4 text-purple-500" />;
      case 'CLAIM_AVAILABLE':
      case 'CLAIM_PROCESSED':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'CLAIM_EXPIRED':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'DISPUTE_RAISED':
      case 'DISPUTE_RESOLVED':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActionLabel = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getActorBadge = (actorType: string) => {
    switch (actorType) {
      case 'SYSTEM':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">System</Badge>;
      case 'CREATOR':
        return <Badge className="bg-purple-100 text-purple-800 text-xs">Creator</Badge>;
      case 'INVESTOR':
        return <Badge className="bg-green-100 text-green-800 text-xs">Investor</Badge>;
      case 'ADMIN':
        return <Badge className="bg-red-100 text-red-800 text-xs">Admin</Badge>;
      default:
        return <Badge className="text-xs">{actorType}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Escrow Audit Trail
        </CardTitle>
        <CardDescription>
          Immutable record of all escrow operations. Each entry is cryptographically signed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No audit entries yet</p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="mt-1">{getActionIcon(log.action)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{getActionLabel(log.action)}</span>
                    {getActorBadge(log.actorType)}
                    {log.amount && (
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(log.amount)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3" />
                    {new Date(log.createdAt).toLocaleString()}
                    {log.signature && (
                      <>
                        <span className="mx-1">•</span>
                        <span className="font-mono truncate max-w-[120px]" title={log.signature}>
                          sig: {log.signature.slice(0, 8)}...
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
