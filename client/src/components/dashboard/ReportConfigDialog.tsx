import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const reportConfigSchema = z.object({
  name: z.string().min(1, 'Report name is required'),
  description: z.string().min(1, 'Description is required'),
  schedule: z.object({
    frequency: z.enum(['weekly', 'monthly', 'quarterly']),
    day: z.string(),
    time: z.string(),
    month: z.string().optional(),
  }),
  settings: z.object({
    includeParticipants: z.boolean(),
    includeActionItems: z.boolean(),
    includeSummary: z.boolean(),
    meetingTypes: z.array(z.string()),
  }),
});

type ReportConfigFormValues = z.infer<typeof reportConfigSchema>;

interface ReportConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType?: {
    id: string;
    name: string;
    description: string;
    schedule: {
      frequency: 'weekly' | 'monthly' | 'quarterly';
      day: string;
      time: string;
      month?: string;
    };
    settings: {
      includeParticipants: boolean;
      includeActionItems: boolean;
      includeSummary: boolean;
      meetingTypes: string[];
    };
  };
  onSubmit: (data: ReportConfigFormValues) => void;
}

export function ReportConfigDialog({
  open,
  onOpenChange,
  reportType,
  onSubmit,
}: ReportConfigDialogProps) {
  const form = useForm<ReportConfigFormValues>({
    resolver: zodResolver(reportConfigSchema),
    defaultValues: reportType || {
      name: '',
      description: '',
      schedule: {
        frequency: 'weekly',
        day: '',
        time: '',
      },
      settings: {
        includeParticipants: true,
        includeActionItems: true,
        includeSummary: true,
        meetingTypes: [],
      },
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {reportType ? 'Edit Report Configuration' : 'Create New Report'}
          </DialogTitle>
          <DialogDescription>
            Configure the settings and schedule for your automated report
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter report name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter report description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Schedule</h3>
              <div className="grid gap-4">
                <FormField
                  control={form.control}
                  name="schedule.frequency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Frequency</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch('schedule.frequency') === 'weekly' && (
                  <FormField
                    control={form.control}
                    name="schedule.day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Week</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select day" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Monday">Monday</SelectItem>
                            <SelectItem value="Tuesday">Tuesday</SelectItem>
                            <SelectItem value="Wednesday">Wednesday</SelectItem>
                            <SelectItem value="Thursday">Thursday</SelectItem>
                            <SelectItem value="Friday">Friday</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('schedule.frequency') === 'monthly' && (
                  <FormField
                    control={form.control}
                    name="schedule.day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            max="31"
                            placeholder="Enter day (1-31)"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {form.watch('schedule.frequency') === 'quarterly' && (
                  <>
                    <FormField
                      control={form.control}
                      name="schedule.month"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Months</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select months" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="March,June,September,December">
                                March, June, September, December
                              </SelectItem>
                              <SelectItem value="January,April,July,October">
                                January, April, July, October
                              </SelectItem>
                              <SelectItem value="February,May,August,November">
                                February, May, August, November
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="schedule.day"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Day of Month</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="Enter day (1-31)"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <FormField
                  control={form.control}
                  name="schedule.time"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Report Settings</h3>
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="settings.includeParticipants"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Include Participants</FormLabel>
                        <FormDescription>
                          Include meeting participants in the report
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.includeActionItems"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Include Action Items</FormLabel>
                        <FormDescription>
                          Include action items from meetings
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="settings.includeSummary"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Include Summary</FormLabel>
                        <FormDescription>
                          Include meeting summaries in the report
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="submit">
                {reportType ? 'Save Changes' : 'Create Report'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 