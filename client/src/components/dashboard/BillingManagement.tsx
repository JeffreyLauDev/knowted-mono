import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { useBilling } from '@/hooks/useBilling';
import { ArrowRight, CreditCard, Users } from 'lucide-react';

const BillingManagement = (): JSX.Element => {
  const { organization } = useAuth();
  const { createBillingPortalSession, isLoading } = useBilling();

  const handleManageBilling = async (): Promise<void> => {
    await createBillingPortalSession();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Billing & Subscription
        </CardTitle>
        <CardDescription>
          Manage your subscription and billing information
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Plan */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Current Plan</p>
                <p className="text-sm text-muted-foreground">Free Plan</p>
              </div>
            </div>
            <Badge variant="secondary">Free</Badge>
          </div>

          {/* Billing Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Organization</span>
              <span>{organization?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Billing Cycle</span>
              <span>Monthly</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Next Billing</span>
              <span>N/A</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleManageBilling}
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Loading...' : 'Manage Billing'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.location.href = '/organization/billing'}
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              View Plans
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BillingManagement;
