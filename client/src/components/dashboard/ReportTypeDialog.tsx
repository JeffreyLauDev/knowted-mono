import { useMeetingTypesControllerFindAll, useReportTypesControllerUpdate } from '@/api/generated/knowtedAPI';
import { MeetingTypeResponse } from '@/api/generated/models/meetingTypeResponse';
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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

// Define ReportType interface since we can't import it
interface ReportType {
  report_title: string;
  report_schedule: { [key: string]: unknown };
  report_prompt: string;
  meeting_types?: MeetingTypeResponse[];
  active?: boolean;
}

const reportTypeSchema = z.object({
  report_title: z.string().min(1, 'Report title is required'),
  report_schedule: z.object({
    frequency: z.enum(['weekly', 'monthly', 'quarterly']),
    day: z.string().min(1, 'Day is required'),
    time: z.string().min(1, 'Time is required'),
    month: z.string().nullable().optional(),
  }),
  report_prompt: z.string().min(1, 'Report prompt is required'),
  meeting_type_ids: z.array(z.string()).min(1, 'At least one meeting type is required'),
  active: z.boolean().default(true),
});

type ReportTypeFormValues = z.infer<typeof reportTypeSchema>;

interface ReportTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType?: ReportType & { id?: string };
  onSubmit: (data: ReportTypeFormValues) => void;
  organizationId: string;
}

const defaultPrompt = `Please provide a comprehensive report that includes:

1. A summary of the meeting
2. Key points and important takeaways
3. Action items and responsibilities
4. Recommendations for next steps`;

export const ReportTypeDialog = ({
  open,
  onOpenChange,
  reportType,
  onSubmit,
  organizationId,
}: ReportTypeDialogProps) => {
  const { data: meetingTypesResponse, isLoading: isLoadingMeetingTypes } = useMeetingTypesControllerFindAll(
    { organization_id: organizationId },
    {
      query: {
        enabled: !!organizationId,
      }
    }
  );

  const meetingTypes = Array.isArray(meetingTypesResponse) ? meetingTypesResponse : [];

  const updateMutation = useReportTypesControllerUpdate();

  const form = useForm<ReportTypeFormValues>({
    resolver: zodResolver(reportTypeSchema),
    defaultValues: {
      report_title: '',
      report_schedule: {
        frequency: 'weekly',
        day: '1',
        time: '09:00',
        month: null,
      },
      report_prompt: defaultPrompt,
      meeting_type_ids: [],
      active: true,
    },
  });

  // Update form values when reportType changes
  useEffect(() => {
    if (reportType) {
      const schedule = reportType.report_schedule as {
        frequency: 'weekly' | 'monthly' | 'quarterly';
        day: string;
        time: string;
        month?: string;
      };
      form.reset({
        report_title: reportType.report_title,
        report_schedule: {
          frequency: schedule.frequency || 'weekly',
          day: schedule.day || '1',
          time: schedule.time || '09:00',
          month: schedule.month || null,
        },
        report_prompt: reportType.report_prompt,
        meeting_type_ids: reportType.meeting_types?.map(mt => mt.id) || [],
        active: reportType.active ?? true,
      });
    } else {
      form.reset({
        report_title: '',
        report_schedule: {
          frequency: 'weekly',
          day: '1',
          time: '09:00',
          month: null,
        },
        report_prompt: defaultPrompt,
        meeting_type_ids: [],
        active: true,
      });
    }
  }, [reportType, form]);

  const handleSubmit = async (data: ReportTypeFormValues) => {
        if (reportType?.id) {
            // Update existing report type
      try {
                
        const response = await updateMutation.mutateAsync({
          id: reportType.id,
          data: {
            report_title: data.report_title,
            report_prompt: data.report_prompt,
            report_schedule: {
              frequency: data.report_schedule.frequency,
              day: data.report_schedule.day,
              time: data.report_schedule.time,
              month: data.report_schedule.month || undefined,
            },
            meeting_types: data.meeting_type_ids,
            active: data.active,
          },
          params: {
            organization_id: organizationId,
          },
        });
        
                onSubmit(data);
        onOpenChange(false); // Close the dialog after successful update
      } catch (error) {
        console.error('Failed to update report type:', error);
      }
    } else {
            // Create new report type - transform the data to match the expected API format
      const transformedData = {
        report_title: data.report_title,
        report_prompt: data.report_prompt,
        report_schedule: {
          frequency: data.report_schedule.frequency,
          day: data.report_schedule.day,
          time: data.report_schedule.time,
          month: data.report_schedule.month || undefined,
        },
        meeting_types: data.meeting_type_ids, // Transform meeting_type_ids to meeting_types
        active: data.active,
      };
            onSubmit(transformedData);
      onOpenChange(false); // Close the dialog after successful creation
    }
  };

  useEffect(() => {
    const subscription = form.watch((value, { name, type }) => {
          });
    return () => subscription.unsubscribe();
  }, [form.watch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {reportType ? 'Edit Report Type' : 'Create Report Type'}
          </DialogTitle>
          <DialogDescription>
            {reportType
              ? 'Update the report type configuration'
              : 'Configure a new report type'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form 
            onSubmit={async (e) => {
              e.preventDefault();
                            
              const formData = form.getValues();
                            
              const isValid = await form.trigger();
                            
              if (isValid) {
                                handleSubmit(formData);
              } else {
                                console.log('Form errors:', JSON.stringify(form.formState.errors, null, 2));
              }
            }} 
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="report_title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter report title" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-sm font-medium">Schedule Configuration</h3>
              <FormField
                control={form.control}
                name="report_schedule.frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Schedule Frequency</FormLabel>
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
              {form.watch('report_schedule.frequency') === 'weekly' && (
                <FormField
                  control={form.control}
                  name="report_schedule.day"
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
                          <SelectItem value="1">Monday</SelectItem>
                          <SelectItem value="2">Tuesday</SelectItem>
                          <SelectItem value="3">Wednesday</SelectItem>
                          <SelectItem value="4">Thursday</SelectItem>
                          <SelectItem value="5">Friday</SelectItem>
                          <SelectItem value="6">Saturday</SelectItem>
                          <SelectItem value="7">Sunday</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch('report_schedule.frequency') === 'monthly' && (
                <FormField
                  control={form.control}
                  name="report_schedule.day"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Month</FormLabel>
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
                          {Array.from({ length: 31 }, (_, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>
                              {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {form.watch('report_schedule.frequency') === 'quarterly' && (
                <>
                  <FormField
                    control={form.control}
                    name="report_schedule.month"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select month" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">January</SelectItem>
                            <SelectItem value="4">April</SelectItem>
                            <SelectItem value="7">July</SelectItem>
                            <SelectItem value="10">October</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="report_schedule.day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Day of Month</FormLabel>
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
                            {Array.from({ length: 31 }, (_, i) => (
                              <SelectItem key={i + 1} value={(i + 1).toString()}>
                                {i + 1}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
              <FormField
                control={form.control}
                name="report_schedule.time"
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

            <FormField
              control={form.control}
              name="meeting_type_ids"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Meeting Types</FormLabel>
                    <FormDescription>
                      Select the meeting types to include in this report
                    </FormDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {isLoadingMeetingTypes ? (
                      <div className="flex items-center justify-center w-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      meetingTypes.map((meetingType) => (
                        <FormField
                          key={meetingType.id}
                          control={form.control}
                          name="meeting_type_ids"
                          render={({ field }) => {
                            const isSelected = field.value?.includes(meetingType.id);
                            return (
                              <FormItem
                                key={meetingType.id}
                                className="m-0"
                              >
                                <FormControl>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        field.onChange(
                                          field.value?.filter(
                                            (value) => value !== meetingType.id
                                          )
                                        );
                                      } else {
                                        field.onChange([...field.value, meetingType.id]);
                                      }
                                    }}
                                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors
                                      ${isSelected 
                                        ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                                      }`}
                                  >
                                    {meetingType.name}
                                  </button>
                                </FormControl>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="report_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the prompt for generating the report"
                      className="min-h-[200px]"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This prompt will be used to generate the report. You can customize it to include specific requirements or focus areas.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      Enable or disable this report type
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

            <DialogFooter>
              <Button type="submit">
                {reportType ? 'Update Report Type' : 'Create Report Type'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}; 