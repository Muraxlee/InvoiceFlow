
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageHeader from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MeasurementForm, type MeasurementFormValues } from '@/components/measurement-form';
import { ArrowLeft, Pencil, Save, CalendarCheck2, Info, UserCircle, Loader2, AlertCircle, RefreshCw, Ruler, FileText, StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { type Measurement } from '@/types/database';
import { getMeasurement, updateMeasurement } from '@/lib/firestore-actions';
import { format as formatDateFns, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';


export default function MeasurementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);

  const { data: measurement, isLoading, error, refetch } = useQuery<Measurement | null>({
    queryKey: ['measurement', params.id],
    queryFn: () => getMeasurement(params.id),
    enabled: !!params.id,
  });

  const saveMutation = useMutation({
    mutationFn: (data: { id: string; values: Partial<Omit<Measurement, 'id' | 'createdAt'>> }) => updateMeasurement(data.id, data.values),
    onSuccess: (savedId) => {
      toast({
        title: 'Measurement Updated',
        description: `Measurement record has been updated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['measurement', params.id] });
      queryClient.invalidateQueries({ queryKey: ['measurements'] });
      setIsEditing(false);
    },
    onError: (error) => {
      console.error('Error saving measurement:', error);
      toast({ title: 'Error', description: 'Failed to save measurement changes', variant: 'destructive' });
    }
  });
  
  useEffect(() => {
    if (!isLoading && !measurement && !error) {
        toast({
            title: 'Measurement Not Found',
            description: `Could not find measurement record with ID ${params.id}`,
            variant: 'destructive',
        });
        router.push('/measurements');
    }
  }, [isLoading, measurement, params.id, router, toast, error]);

  const handleSave = async (data: MeasurementFormValues) => {
    if (!measurement?.id) return;
    const { id, ...updateData } = data;
    const finalData = {
        ...updateData,
        notes: updateData.notes || '',
        customType: updateData.customType || '',
        customerId: updateData.customerId || '',
    };
    saveMutation.mutate({ id: measurement.id, values: finalData });
  };
  
  const DetailItem = ({ label, value, icon, className }: { label: string; value: string | React.ReactNode; icon?: React.ElementType; className?: string }) => {
    const Icon = icon;
    return (
      <div className={cn("flex flex-col", className)}>
        <dt className="text-xs font-medium text-muted-foreground flex items-center gap-1">
          {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        </dt>
        <dd className="text-sm">{value || '-'}</dd>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader title="Error" description="There was a problem loading this measurement record."/>
         <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error: Missing or Insufficient Permissions</AlertTitle>
          <AlertDescription>
            <p>The application cannot access this record. Please check your Firestore security rules and ensure you have permission.</p>
          </AlertDescription>
        </Alert>
        <div className="flex gap-2">
          <Link href="/measurements">
            <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Measurements</Button>
          </Link>
          <Button onClick={() => refetch()} className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!measurement) {
    return null; // Should be handled by useEffect redirect
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title={isEditing ? `Edit Record ${measurement.uniqueId}` : `Measurement Record ${measurement.uniqueId}`}
        description={isEditing ? `Make changes to this measurement record.` : `View details for ${measurement.customerName}`}
        actions={
          <div className="flex gap-2">
            <Link href="/measurements">
              <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
            </Link>
            {!isEditing && (
              <Button onClick={() => setIsEditing(true)}><Pencil className="mr-2 h-4 w-4" /> Edit Record</Button>
            )}
            {isEditing && (
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saveMutation.isPending}>
                Cancel
              </Button>
            )}
          </div>
        }
      />

      {isEditing ? (
        <Card className="p-4 md:p-6">
           <MeasurementForm 
            onSubmit={handleSave} 
            defaultValues={measurement}
            isLoading={saveMutation.isPending} 
            onCancel={() => setIsEditing(false)}
          />
        </Card>
      ) : (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Record Summary</CardTitle>
                </CardHeader>
                <CardContent>
                    <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-6">
                        <DetailItem label="Record ID" value={measurement.uniqueId} icon={FileText} />
                        <DetailItem label="Customer" value={measurement.customerName} icon={UserCircle} />
                        <DetailItem label="Garment Type" value={<Badge variant="secondary">{measurement.type === 'Custom' ? measurement.customType : measurement.type}</Badge>} icon={Ruler}/>
                        <DetailItem label="Date Recorded" value={isValid(new Date(measurement.recordedDate)) ? formatDateFns(new Date(measurement.recordedDate), 'PP') : 'N/A'} icon={CalendarCheck2} />
                        <DetailItem label="Delivery Date" value={measurement.deliveryDate && isValid(new Date(measurement.deliveryDate)) ? formatDateFns(new Date(measurement.deliveryDate), 'PP') : 'N/A'} icon={CalendarCheck2} />
                    </dl>
                </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-1"><Ruler className="h-5 w-5" />Measurement Values</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {measurement.values.map((item, index) => (
                    <div key={index} className="flex flex-col p-3 border rounded-md bg-muted/20">
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-lg font-semibold">
                        {item.value} <span className="text-sm font-normal text-muted-foreground">{item.unit}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {measurement.notes && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-1"><StickyNote className="h-5 w-5" />Notes</CardTitle></CardHeader>
                <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{measurement.notes}</p>
                </CardContent>
              </Card>
            )}
        </div>
      )}
    </div>
  );
}
