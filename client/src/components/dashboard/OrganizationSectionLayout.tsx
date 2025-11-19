import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { ReactNode } from 'react';

interface OrganizationSectionLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
}

const OrganizationSectionLayout = ({
  title,
  description,
  children,
}: OrganizationSectionLayoutProps) => {
      return (
    <Card className="shadow-sm overflow-hidden bg-white">
      <CardHeader className="bg-primary text-primary-foreground">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-white/80">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        {children}
      </CardContent>
    </Card>
  );
};

export default OrganizationSectionLayout; 