import { Injectable } from "@nestjs/common";

import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";

import { EventType } from "../usage-events/entities/usage-event.entity";
import { UsageEventsService } from "../usage-events/usage-events.service";

@Injectable()
export class AiService {
  private readonly model: ChatOpenAI;
  private readonly titlePrompt: PromptTemplate;
  private readonly meetingTypePrompt: PromptTemplate;
  private readonly analysisTopicsPrompt: PromptTemplate;

  constructor(private readonly usageEventsService: UsageEventsService) {
    this.model = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
    });

    this.titlePrompt = PromptTemplate.fromTemplate(
      "Generate a concise and descriptive title (maximum 5 words) for a conversation that starts with this message: {input}. Make sure that the title doesn't contain any special characters or numbers.",
    );

    this.meetingTypePrompt = PromptTemplate.fromTemplate(
      `You are an AI system that generates structured metadata definitions for internal organisation meetings at **{organisation}**.

**About the organisation:** {organisation_about}

They currently already capture the following meeting types:
**{meeting_types}**

Your task is to return a single JSON object containing example values, not a schema definition.
Do not wrap the output in a list or in an output object.
Return only the populated structure:

1. \`meeting_type\`

A **capitalized, one-word label** for the new type of meeting (e.g., \`"Recruitment"\`). This should not match any of the existing meeting types listed above.

2. \`meeting_type_description\`

A **clear and informative sentence or compound sentence** that explains the purpose of this meeting type in the context of the organisation.
Describe the typical participants, subjects discussed, decisions made, and goals.

3. \`analysis_metadata_structure\`

An **open-ended object** that contains **contextually relevant key-value pairs** representing the types of data that should be captured during or after this meeting.

#### Guidelines for this structure:

* Each key should be a **short, intuitive label** (e.g., \`"Key Risks"\`, \`"Customer Feedback"\`, \`"Next Steps"\`) each must have spaces

* Each value should be a **plain-language description** of what that field is meant to capture
* Do not use fixed or predefined field names. **Generate new fields** based on the purpose and nature of the meeting type
* Fields may be **operational, strategic, relational, or procedural** — use your reasoning
* The object should contain as many fields as are useful — **20+ fields is acceptable if contextually relevant**
* Output this object in a format that assumes:

  \`\`\`
  {{
    "type": "object",
    "additional properties": {{
      "type": "string"
    }}
  }}
  \`\`\`

The goal is to provide a schema-like metadata structure that can flexibly grow with usage and remain relevant across various meeting instances of the same type.

Users meeting_type request/objective: {objective}`,
    );

    this.analysisTopicsPrompt = PromptTemplate.fromTemplate(
      `You are an AI system that generates analysis topics for meeting types at **{organisation}**.

**About the organisation:** {organisation_about}

You need to generate analysis topics for this meeting type:
**Meeting Type:** {meeting_type}
**Description:** {meeting_type_description}

Your task is to return a JSON object containing **contextually relevant key-value pairs** representing the types of data that should be captured during or after this meeting.

#### Guidelines for the analysis topics:

* Each key should be a **short, intuitive label** (e.g., \`"Key Risks"\`, \`"Customer Feedback"\`, \`"Next Steps"\`) each must have spaces
* Each value should be a **plain-language description** of what that field is meant to capture
* Do not use fixed or predefined field names. **Generate new fields** based on the purpose and nature of the meeting type
* Fields may be **operational, strategic, relational, or procedural** — use your reasoning
* The object should contain as many fields as are useful — **15-25 fields is ideal** for comprehensive coverage
* Focus on topics that would be relevant for this specific meeting type and organization context
* Consider what information would be valuable to extract, track, or follow up on after this meeting

Return only the analysis_metadata_structure object in this format:
\`\`\`json
{{
  "Topic Name 1": "Description of what this topic captures",
  "Topic Name 2": "Description of what this topic captures",
  "Topic Name 3": "Description of what this topic captures"
}}
\`\`\``,
    );
  }

  async generateTitle(
    input: string,
    organizationId: string,
    userId: string,
  ): Promise<string> {
    // Track AI usage
    await this.usageEventsService.logEvent(
      organizationId,
      EventType.AI_TITLE_GENERATED,
      userId,
      {
        model: "gpt-4o-mini",
        inputLength: input.length,
      },
      1,
    );

    const prompt = await this.titlePrompt.format({ input });
    const response = await this.model.invoke(prompt);
    return response.content.toString().trim();
  }

  async generateMeetingType(
    objective: string,
    organisation: string = "Grayza",
    organisation_about: string = "Grayza a QR code ordering software for restaurants",
    meeting_types: string = "Sales - This type of call is for when we are preparing someone to purchase something from our company | Support - This meeting type is give an existing customer support with our product | Onboarding - This type of call is when a customer is being onboarded with our product and we are going through the stages of getting them upto speed | Business - This is usually calls between the internal team discuss objectives and strategy",
    organizationId: string,
    userId: string,
  ): Promise<{
    meeting_type: string;
    meeting_type_description: string;
    analysis_metadata_structure: Record<string, string>;
  }> {
    // Track AI usage
    await this.usageEventsService.logEvent(
      organizationId,
      EventType.AI_TITLE_GENERATED, // We can reuse this event type or create a new one
      userId,
      {
        model: "gpt-4o-mini",
        inputLength: objective.length,
        operation: "meeting_type_generation",
      },
      1,
    );

    const prompt = await this.meetingTypePrompt.format({
      objective,
      organisation,
      organisation_about,
      meeting_types,
    });

    const fullPrompt = `${prompt}\n\nPlease return your response as a valid JSON object with the following structure:
{
  "meeting_type": "string",
  "meeting_type_description": "string", 
  "analysis_metadata_structure": {
    "Topic Name 1": "Description",
    "Topic Name 2": "Description"
  }
}`;

    try {
      const response = await this.model.invoke(fullPrompt);
      const content = response.content.toString();
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          meeting_type: parsed.meeting_type || objective,
          meeting_type_description: parsed.meeting_type_description || `Meeting type for ${objective}`,
          analysis_metadata_structure: parsed.analysis_metadata_structure || {},
        };
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // If all else fails, return a basic structure
    return {
      meeting_type: objective,
      meeting_type_description: `Meeting type for ${objective}`,
      analysis_metadata_structure: {
        "Key Points": "Important discussion points and decisions made",
        "Action Items": "Tasks and follow-up actions identified",
        "Next Steps": "Planned future actions and timeline",
      },
    };
  }

  async generateAnalysisTopics(
    meeting_type: string,
    meeting_type_description: string,
    organisation: string = "Grayza",
    organisation_about: string = "Grayza a QR code ordering software for restaurants",
    organizationId: string,
    userId: string,
  ): Promise<Record<string, string>> {
    // Track AI usage
    await this.usageEventsService.logEvent(
      organizationId,
      EventType.AI_TITLE_GENERATED, // We can reuse this event type or create a new one
      userId,
      {
        model: "gpt-4o-mini",
        inputLength: meeting_type_description.length,
        operation: "analysis_topics_generation",
      },
      1,
    );

    const prompt = await this.analysisTopicsPrompt.format({
      meeting_type,
      meeting_type_description,
      organisation,
      organisation_about,
    });

    const fullPrompt = `${prompt}\n\nPlease return your response as a valid JSON object with the following structure:
{
  "Topic Name 1": "Description of what this topic captures",
  "Topic Name 2": "Description of what this topic captures",
  "Topic Name 3": "Description of what this topic captures"
}`;

    try {
      const response = await this.model.invoke(fullPrompt);
      const content = response.content.toString();
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed;
      }
    } catch (error) {
      console.error('Error parsing AI response:', error);
    }

    // If all else fails, return a basic structure
    return {
      "Key Points": "Important discussion points and decisions made",
      "Action Items": "Tasks and follow-up actions identified",
      "Next Steps": "Planned future actions and timeline",
      "Decisions Made": "Key decisions reached during the meeting",
      "Follow-up Required": "Items that need follow-up or additional action",
    };
  }
}
