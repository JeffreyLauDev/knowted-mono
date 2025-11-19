import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface CustomAgentConfig {
  default_ai_agent: boolean;
  // Add other config properties as needed
}

export function CustomAgentsSettings() {
  const [isCustomAgentDialogOpen, setIsCustomAgentDialogOpen] = useState(false);
  const [agentConfig, setAgentConfig] = useState<CustomAgentConfig>({
    default_ai_agent: true,
  });

  const handleAgentSelect = (isDefault: boolean) => {
    if (isDefault) {
      setAgentConfig({ default_ai_agent: true });
    } else {
      setIsCustomAgentDialogOpen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">Agent Type:</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="w-[200px] justify-between">
              {agentConfig.default_ai_agent ? "Default Agent" : "Custom Agent"}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleAgentSelect(true)}>
              Default Agent
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleAgentSelect(false)}>
              Custom Agent
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={isCustomAgentDialogOpen} onOpenChange={setIsCustomAgentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configure Custom Agent</DialogTitle>
          </DialogHeader>
          {/* Add your custom agent configuration form here */}
          <div className="space-y-4">
            {/* Custom agent configuration fields will go here */}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 