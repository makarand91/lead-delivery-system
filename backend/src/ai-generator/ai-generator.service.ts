import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AwsClientsService } from '../common/aws-clients.service';

export interface GenerateIntegrationCodeRequest {
  crmType: string;
  crmEndpoint: string;
  authMethod: string;
  fieldMappings?: any[];
  customRequirements?: string;
}

@Injectable()
export class AiGeneratorService {
  private readonly modelId: string;

  constructor(
    private awsClients: AwsClientsService,
    private configService: ConfigService,
  ) {
    this.modelId = this.configService.get('BEDROCK_MODEL_ID') ||
                   'anthropic.claude-3-5-sonnet-20240620-v1:0';
  }

  async generateIntegrationCode(request: GenerateIntegrationCodeRequest): Promise<string> {
    const prompt = this.buildPrompt(request);

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.7,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.awsClients.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Extract code from response
      const generatedText = responseBody.content[0].text;
      return this.extractCode(generatedText);
    } catch (error) {
      console.error('Error generating code with Bedrock:', error);
      throw new Error('Failed to generate integration code');
    }
  }

  private buildPrompt(request: GenerateIntegrationCodeRequest): string {
    return `You are an expert Node.js developer creating AWS Lambda functions for CRM integrations.

Generate a complete, production-ready AWS Lambda function (Node.js 20.x) that:

1. **CRM Details:**
   - CRM Type: ${request.crmType}
   - CRM Endpoint: ${request.crmEndpoint}
   - Authentication: ${request.authMethod}

2. **Function Requirements:**
   - Receives an array of leads with field mappings
   - Applies transformation functions to fields
   - Pushes leads to the CRM via REST API
   - Returns success/failure status for each lead
   - Handles errors gracefully with retry logic
   - Logs to ElasticSearch

3. **Input Format:**
\`\`\`javascript
{
  leads: [{ /* lead data */ }],
  fieldMappings: {
    sourceField: { targetField: 'crmField', transformation: 'functionName' }
  },
  credentials: { apiKey: '...', /* other auth tokens */ },
  customContext: { /* headers, endpoints, etc */ }
}
\`\`\`

4. **Output Format:**
\`\`\`javascript
{
  results: [
    { leadIndex: 0, status: 'SUCCESS', crmId: '...' },
    { leadIndex: 1, status: 'FAILED', error: '...' }
  ],
  summary: { total: 2, success: 1, failed: 1 }
}
\`\`\`

5. **Code Requirements:**
   - Use async/await
   - Include proper error handling
   - Add retry logic (3 attempts with exponential backoff)
   - Validate input data
   - Log all operations
   - Use axios for HTTP requests
   - Include transformation functions (date formatting, phone formatting, etc.)

${request.customRequirements ? `6. **Custom Requirements:**\n${request.customRequirements}\n` : ''}

Generate ONLY the Lambda handler code (index.js) with all necessary helper functions. Do not include package.json or deployment instructions.

Start your response with \`\`\`javascript and end with \`\`\`.`;
  }

  private extractCode(text: string): string {
    // Extract code from markdown code blocks
    const codeBlockRegex = /```(?:javascript|js)?\s*([\s\S]*?)```/;
    const match = text.match(codeBlockRegex);

    if (match && match[1]) {
      return match[1].trim();
    }

    // If no code block found, return the entire text
    return text.trim();
  }

  async generateTransformationFunction(description: string): Promise<string> {
    const prompt = `Generate a JavaScript transformation function based on this description:

"${description}"

The function should:
- Take a value as input
- Return the transformed value
- Handle edge cases and null/undefined values
- Be pure (no side effects)

Example format:
\`\`\`javascript
function transform(value) {
  // Your transformation logic
  return transformedValue;
}
\`\`\`

Generate ONLY the function code.`;

    const payload = {
      anthropic_version: 'bedrock-2023-05-31',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.5,
    };

    const command = new InvokeModelCommand({
      modelId: this.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    try {
      const response = await this.awsClients.bedrockClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      const generatedText = responseBody.content[0].text;
      return this.extractCode(generatedText);
    } catch (error) {
      console.error('Error generating transformation function:', error);
      throw new Error('Failed to generate transformation function');
    }
  }
}
