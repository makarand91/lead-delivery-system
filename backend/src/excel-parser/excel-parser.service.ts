import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { AwsClientsService } from '../common/aws-clients.service';
import * as XLSX from 'xlsx';

export interface ParsedExcelData {
  headers: string[];
  rows: any[];
  totalRows: number;
}

@Injectable()
export class ExcelParserService {
  private readonly leadFilesBucket: string;

  constructor(
    private awsClients: AwsClientsService,
    private configService: ConfigService,
  ) {
    this.leadFilesBucket = this.configService.get('LEAD_FILES_BUCKET');
  }

  async parseExcelFromS3(s3Key: string): Promise<ParsedExcelData> {
    // Get file from S3
    const response = await this.awsClients.s3Client.send(
      new GetObjectCommand({
        Bucket: this.leadFilesBucket,
        Key: s3Key,
      }),
    );

    const buffer = await this.streamToBuffer(response.Body);
    return this.parseExcelBuffer(buffer);
  }

  parseExcelBuffer(buffer: Buffer): ParsedExcelData {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert to JSON
    const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: '',
    });

    if (jsonData.length === 0) {
      throw new Error('Excel file is empty');
    }

    const headers = jsonData[0] as string[];
    const rows = jsonData.slice(1).map((row: any[]) => {
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });

    return {
      headers,
      rows,
      totalRows: rows.length,
    };
  }

  private async streamToBuffer(stream: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: any[] = [];
      stream.on('data', (chunk: any) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  validateHeaders(headers: string[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (headers.length === 0) {
      errors.push('No headers found in Excel file');
    }

    const duplicates = headers.filter((item, index) => headers.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate headers found: ${duplicates.join(', ')}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
