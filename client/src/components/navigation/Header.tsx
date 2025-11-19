
import MeetingCaptureDialog from '@/components/dashboard/MeetingCaptureDialog';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Menu, Plus } from 'lucide-react';
import { useState } from 'react';

interface HeaderProps {
  className?: string;
}

const Header = ({ className }: HeaderProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { organization } = useAuth();

  if (!organization) {return null;}

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b md:hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-2">
          <SidebarTrigger>
            <Button variant="ghost" size="icon" className="hover:bg-accent/10">
              <Menu className="h-6 w-6" strokeWidth={1.5} />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </SidebarTrigger>
        </div>

        <div className="flex-1 flex justify-center">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-2"
          >
            <img
              src="/logos/Knowted Logo - Stacked (Green)@1.5x@1.5x.png"
              alt="Knowted"
              className="h-8 w-auto"
            />
            <span className="text-xl font-semibold text-primary tracking-tight">
              Knowted
            </span>
          </motion.div>
        </div>

        <Button
          size="icon"
          variant="ghost"
          className="hover:bg-accent/10"
          onClick={() => setIsDialogOpen(true)}
        >
          <Plus className="h-6 w-6" strokeWidth={1.5} />
          <span className="sr-only">Add meeting</span>
        </Button>
      </div>

      <MeetingCaptureDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        organizationId={organization.id}
        meetingTypes={[]}
      />
    </motion.header>
  );
};

export default Header;
